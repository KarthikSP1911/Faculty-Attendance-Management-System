#!/usr/bin/env node
// Builds test execution/report markdown from REAL artefacts. Node built-ins only.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const P = (...s) => path.join(ROOT, ...s);
const rel = (p) => path.relative(ROOT, p).split(path.sep).join('/');
const notes = []; // missing-input messages
let parseErrors = 0;

const exists = (p) => fs.existsSync(p);
const read = (p) => fs.readFileSync(p, 'utf8');
const mtime = (p) => fs.statSync(p).mtime;
function fail(msg) { parseErrors++; console.error('PARSE ERROR: ' + msg); notes.push('PARSE ERROR: ' + msg); }
function missing(msg) { console.warn('MISSING: ' + msg); notes.push(msg); }
const unesc = (s) => s.replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).replace(/&amp;/g, '&');
const attrs = (tag) => { const o = {}; for (const m of tag.matchAll(/([\w:.-]+)="([^"]*)"/g)) o[m[1]] = unesc(m[2]); return o; };
const fmtS = (s) => (s >= 60 ? `${Math.floor(s / 60)}m ${(s % 60).toFixed(1)}s` : `${s.toFixed(2)}s`);
const esc = (s) => String(s ?? '').replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
const pct = (a, b) => (b ? ((a / b) * 100).toFixed(2) + '%' : 'n/a');

// ---------- JUnit ----------
const junitDir = P('apps/api/reports/junit');
const junitSuites = [];
let junitFirstXml = null;
if (exists(junitDir)) {
  for (const f of fs.readdirSync(junitDir).filter((x) => x.endsWith('.xml'))) {
    junitFirstXml ??= path.join(junitDir, f);
    try {
      const xml = read(path.join(junitDir, f));
      if (!/<testsuites?[\s>]/.test(xml)) throw new Error('no <testsuite> element');
      for (const sm of xml.matchAll(/<testsuite\s([^>]*?)(\/>|>([\s\S]*?)<\/testsuite>)/g)) {
        const a = attrs(sm[1]);
        const cases = [];
        for (const cm of (sm[3] || '').matchAll(/<testcase\s([^>]*?)(\/>|>([\s\S]*?)<\/testcase>)/g)) {
          const ca = attrs(cm[1]); const body = cm[3] || '';
          let status = 'passed', msg = '';
          const fm = body.match(/<(failure|error)([^>]*)>?/);
          if (fm) {
            status = 'failed';
            const inner = (body.match(/<(?:failure|error)[^>]*>([\s\S]*?)<\/(?:failure|error)>/) || [])[1] || '';
            msg = unesc(attrs(fm[2]).message || inner).trim().slice(0, 300);
          } else if (/<skipped/.test(body)) status = 'skipped';
          cases.push({ name: ca.name || ca.classname || '?', status, msg });
        }
        junitSuites.push({ name: a.name || '?', xml: f, tests: cases.length, time: parseFloat(a.time || '0'), cases });
      }
    } catch (e) { fail(`${rel(path.join(junitDir, f))}: ${e.message}`); }
  }
  if (!junitSuites.length) missing('No JUnit testsuites found in apps/api/reports/junit');
} else missing('apps/api/reports/junit not found (run Jest first)');

// ---------- Jest test files -> junit suites (junit has no file attribute; match describe titles) ----------
const jestFiles = new Map();
(function walk(d, base = '') {
  if (!exists(d)) return;
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    if (e.isDirectory()) walk(path.join(d, e.name), base + e.name + '/');
    else if (/\.test\.ts$/.test(e.name)) {
      const src = read(path.join(d, e.name)); const set = new Set();
      for (const m of src.matchAll(/\bdescribe(?:\.\w+)?\s*\(\s*(['"`])((?:\\.|(?!\1).)*)\1/g)) set.add(m[2]);
      jestFiles.set(base + e.name, set);
    }
  }
})(P('apps/api/tests'));
function jestResultFor(file) {
  const set = jestFiles.get(file);
  if (!set) return { err: `test file ${file} not found under apps/api/tests` };
  const suites = junitSuites.filter((s) => set.has(s.name));
  if (!suites.length) return { err: `no junit suite matched describe titles of ${file}` };
  const cs = suites.flatMap((s) => s.cases);
  return { total: cs.length, passed: cs.filter((c) => c.status === 'passed').length, failed: cs.filter((c) => c.status === 'failed') };
}

// ---------- Playwright ----------
const pwPath = P('apps/web/test-results/results.json');
const pwTests = [];
let pwStats = null;
if (exists(pwPath)) {
  try {
    const j = JSON.parse(read(pwPath));
    pwStats = j.stats || null;
    const walkS = (s, file) => {
      const f = s.file || file;
      for (const sp of s.specs || []) for (const t of sp.tests || []) {
        const last = (t.results || [])[(t.results || []).length - 1];
        const st = t.status === 'expected' ? 'passed' : t.status === 'skipped' ? 'skipped' : t.status === 'flaky' ? 'flaky' : 'failed';
        pwTests.push({ title: sp.title, project: t.projectName, status: st, file: sp.file || f, error: last?.error?.message ? String(last.error.message).replace(/\u001b\[[0-9;]*m/g, '').slice(0, 300) : '' });
      }
      for (const c of s.suites || []) walkS(c, f);
    };
    for (const s of j.suites || []) walkS(s, s.file);
  } catch (e) { fail(`${rel(pwPath)}: ${e.message}`); }
} else missing('apps/web/test-results/results.json not found (run Playwright first)');

// ---------- Coverage ----------
let cov = null, covSrc = '';
const covSum = P('apps/api/coverage/coverage-summary.json'), lcov = P('apps/api/coverage/lcov.info');
try {
  if (exists(covSum)) {
    const t = JSON.parse(read(covSum)).total; covSrc = rel(covSum);
    cov = { lines: t.lines, statements: t.statements, functions: t.functions, branches: t.branches };
  } else if (exists(lcov)) {
    covSrc = rel(lcov);
    const c = { lines: [0, 0], branches: [0, 0], functions: [0, 0] };
    for (const l of read(lcov).split(/\r?\n/)) {
      let m;
      if ((m = l.match(/^LF:(\d+)/))) c.lines[1] += +m[1]; else if ((m = l.match(/^LH:(\d+)/))) c.lines[0] += +m[1];
      else if ((m = l.match(/^BRF:(\d+)/))) c.branches[1] += +m[1]; else if ((m = l.match(/^BRH:(\d+)/))) c.branches[0] += +m[1];
      else if ((m = l.match(/^FNF:(\d+)/))) c.functions[1] += +m[1]; else if ((m = l.match(/^FNH:(\d+)/))) c.functions[0] += +m[1];
    }
    const o = (a) => ({ covered: a[0], total: a[1], pct: a[1] ? (a[0] / a[1]) * 100 : 100 });
    cov = { lines: o(c.lines), statements: o(c.lines), functions: o(c.functions), branches: o(c.branches), stmtNote: true };
  } else missing('apps/api/coverage (lcov.info / coverage-summary.json) not found');
} catch (e) { fail(`coverage: ${e.message}`); }

// ---------- Mutation ----------
let mut = null;
const mutPath = P('apps/api/reports/mutation/mutation.json');
if (exists(mutPath)) {
  try {
    const j = JSON.parse(read(mutPath));
    const cnt = { Killed: 0, Survived: 0, NoCoverage: 0, Timeout: 0, CompileError: 0, RuntimeError: 0, Ignored: 0 };
    for (const f of Object.values(j.files || {})) for (const m of f.mutants || []) cnt[m.status] = (cnt[m.status] || 0) + 1;
    const detected = cnt.Killed + cnt.Timeout;
    const valid = detected + cnt.Survived + cnt.NoCoverage;
    mut = { cnt, score: valid ? (detected / valid) * 100 : 0 };
  } catch (e) { fail(`${rel(mutPath)}: ${e.message}`); }
} else missing('apps/api/reports/mutation/mutation.json not found (mutation testing not run)');

// ---------- Thresholds ----------
let jestThr = null, strykerThr = null;
try {
  const jc = read(P('apps/api/jest.config.js'));
  const m = jc.match(/coverageThreshold\s*:\s*\{\s*global\s*:\s*\{([^}]*)\}/);
  if (m) { jestThr = {}; for (const x of m[1].matchAll(/(\w+)\s*:\s*(\d+(?:\.\d+)?)/g)) jestThr[x[1]] = +x[2]; }
} catch { missing('apps/api/jest.config.js unreadable'); }
try {
  const sp = P('apps/api/stryker.config.json');
  if (exists(sp)) strykerThr = JSON.parse(read(sp)).thresholds || null; else missing('apps/api/stryker.config.json not found');
} catch (e) { fail(`stryker.config.json: ${e.message}`); }

// ---------- Designed test cases ----------
const tcPath = P('02_Test_Case_Design/Test_Cases.md');
const cases = [];
if (!exists(tcPath)) { fail('02_Test_Case_Design/Test_Cases.md not found'); }
else {
  for (const line of read(tcPath).split(/\r?\n/)) {
    if (!/^\|\s*TC-/.test(line)) continue;
    const c = line.replace(/^\|/, '').replace(/\|\s*$/, '').split(/(?<!\\)\|/).map((x) => x.trim());
    if (c.length < 10) { fail(`malformed test case row: ${line.slice(0, 60)}`); continue; }
    const [id, req, tech, , , , , lvl, pri, file] = c;
    cases.push({ id, req, tech, lvl, pri, file, prefix: (id.match(/^TC-([A-Z]+)-/) || [, '?'])[1] });
  }
}

// ---------- Map ----------
const LV = { U: 'Unit', I: 'Integration', E: 'End-to-end', M: 'Manual' };
for (const tc of cases) {
  const pw = pwTests.filter((t) => t.title.startsWith(tc.id + ' ') || t.title.startsWith(tc.id + ':') || t.title === tc.id);
  if (pw.length) {
    const bad = pw.filter((t) => t.status === 'failed');
    tc.result = bad.length ? 'FAIL' : pw.every((t) => t.status === 'skipped') ? 'NOT EXECUTED' : 'PASS';
    tc.evidence = tc.result === 'NOT EXECUTED' ? 'all matching Playwright tests skipped'
      : `Playwright: ${pw.length - bad.length}/${pw.length} test run(s) OK (${[...new Set(pw.map((t) => t.project))].join(', ')}) in ${rel(pwPath)}`;
    tc.failMsgs = bad.map((t) => `${t.title} [${t.project}]: ${t.error}`);
    continue;
  }
  const files = (tc.file || '').split(';').map((x) => x.trim()).filter((x) => /\.test\.ts$/.test(x));
  if (files.length) {
    const parts = files.map((f) => ({ f, r: jestResultFor(f) }));
    const errs = parts.filter((p) => p.r.err);
    if (errs.length) { tc.result = 'NOT EXECUTED'; tc.evidence = 'no automated result found: ' + errs.map((e) => e.r.err).join('; '); continue; }
    const failed = parts.flatMap((p) => p.r.failed.map((c) => `${p.f}: ${c.name}${c.msg ? ' - ' + c.msg : ''}`));
    tc.result = failed.length ? 'FAIL' : 'PASS';
    tc.failMsgs = failed;
    tc.evidence = 'file-level: ' + parts.map((p) => `${p.r.passed}/${p.r.total} tests passed in ${p.f}`).join('; ');
    continue;
  }
  tc.result = 'NOT EXECUTED';
  tc.evidence = /manual/i.test(tc.file) || tc.lvl === 'M' ? 'manual' : /planned/i.test(tc.file) ? 'planned' : 'no automated result found';
}

// ---------- Env ----------
let commit = 'unknown';
try { commit = execSync('git rev-parse --short HEAD', { cwd: ROOT, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); } catch { /* keep */ }
try { if (execSync('git status --porcelain', { cwd: ROOT, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim()) commit += ' (+ uncommitted working-tree changes)'; } catch { /* keep */ }
const mt = [junitFirstXml && mtime(junitFirstXml), exists(pwPath) && mtime(pwPath), exists(mutPath) && mtime(mutPath)].filter(Boolean);
const runDate = mt.length ? new Date(Math.max(...mt)).toISOString() : new Date().toISOString();
const header = `- Run date (latest artefact mtime): ${runDate}\n- Report generated: ${new Date().toISOString()}\n- Git commit: ${commit}\n- Environment: Node ${process.version}, ${os.type()} ${os.release()} (${os.platform()}/${os.arch()}), PostgreSQL 18 in Docker\n- All test data is synthetic.`;

// ---------- Copy artefacts ----------
const OUT6 = P('06_Test_Reports');
const copies = [];
function copy(src, dst, label, filter) {
  if (!exists(src)) { copies.push({ label, ok: false, dst }); missing(`copy skipped, source missing: ${rel(src)}`); return; }
  try { fs.mkdirSync(path.dirname(dst), { recursive: true }); fs.cpSync(src, dst, { recursive: true, force: true, filter }); copies.push({ label, ok: true, dst }); }
  catch (e) { fail(`copy ${rel(src)}: ${e.message}`); }
}
const pwRep = P('apps/web/playwright-report');
copy(P('apps/api/coverage'), path.join(OUT6, 'jest-coverage'), 'Jest coverage');
copy(pwRep, path.join(OUT6, 'playwright-report'), 'Playwright HTML report', (s) => {
  const r = path.relative(pwRep, s).split(path.sep);
  if (r[0] === '') return true;
  if (r.length === 1) return r[0] === 'index.html' || r[0] === 'data';
  return r[0] === 'data' && !/\.(webm|mp4|zip)$/i.test(s) && !/trace/i.test(path.basename(s));
});
copy(P('apps/api/reports/mutation'), path.join(OUT6, 'mutation'), 'Mutation report');
if (exists(path.join(OUT6, 'mutation', 'index.html'))) fs.copyFileSync(path.join(OUT6, 'mutation', 'index.html'), path.join(OUT6, 'mutation', 'mutation.html'));
copy(P('apps/api/reports/junit'), path.join(OUT6, 'junit'), 'JUnit XML');
copy(pwPath, path.join(OUT6, 'playwright-results.json'), 'Playwright JSON');
const copied = (d) => copies.find((c) => c.dst.endsWith(d))?.ok;

// ---------- Write helpers ----------
function write(p, s) { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, s, 'utf8'); console.log('wrote ' + rel(p)); }
const table = (hdr, rows) => `| ${hdr.join(' | ')} |\n|${hdr.map(() => '---').join('|')}|\n${rows.map((r) => '| ' + r.map(esc).join(' | ') + ' |').join('\n')}\n`;

// 1) Execution log
write(P('03_Test_Execution/Test_Execution_Log.md'),
`# Test Execution Log

${header}

Mapping note: results for Jest-based cases are **file-level** (JUnit carries no test-case IDs); a TC is PASS only if every test in its automated file(s) passed. Playwright cases are matched by TC id at the start of the test title.

${table(['ID', 'Tech', 'Level', 'Automated file', 'Result', 'Evidence'], cases.map((c) => [c.id, c.tech, LV[c.lvl] || c.lvl, c.file, c.result, c.evidence]))}`);

// 2) Execution summary
const executed = cases.filter((c) => c.result !== 'NOT EXECUTED');
const cnt = (arr, r) => arr.filter((c) => c.result === r).length;
const group = (key, label) => {
  const keys = [...new Set(cases.map(key))].sort();
  return table([label, 'Designed', 'Executed', 'Pass', 'Fail', 'Not executed', 'Pass rate (executed)'], keys.map((k) => {
    const g = cases.filter((c) => key(c) === k), e = g.filter((c) => c.result !== 'NOT EXECUTED');
    return [k, g.length, e.length, cnt(g, 'PASS'), cnt(g, 'FAIL'), g.length - e.length, pct(cnt(g, 'PASS'), e.length)];
  }));
};
const fails = cases.filter((c) => c.result === 'FAIL');
const notExec = cases.filter((c) => c.result === 'NOT EXECUTED');
const jT = junitSuites.reduce((a, s) => ({ t: a.t + s.tests, f: a.f + s.cases.filter((c) => c.status === 'failed').length, k: a.k + s.cases.filter((c) => c.status === 'skipped').length, d: a.d + s.time }), { t: 0, f: 0, k: 0, d: 0 });
const pwT = { t: pwTests.length, f: pwTests.filter((t) => t.status === 'failed').length, k: pwTests.filter((t) => t.status === 'skipped').length, fl: pwTests.filter((t) => t.status === 'flaky').length };
const covLine = (k) => (cov ? `${cov[k].pct.toFixed(2)}%${cov[k].covered !== undefined ? ` (${cov[k].covered}/${cov[k].total})` : ''}` : 'n/a');
const mutLine = mut ? `${mut.score.toFixed(2)}% (killed ${mut.cnt.Killed}, survived ${mut.cnt.Survived}, no-coverage ${mut.cnt.NoCoverage}, timeout ${mut.cnt.Timeout}; compile-error ${mut.cnt.CompileError} excluded from score)` : 'not available';
write(P('03_Test_Execution/Test_Execution_Summary.md'),
`# Test Execution Summary

${header}

## Totals (designed test cases)
${table(['Designed', 'Executed', 'Pass', 'Fail', 'Not executed', 'Pass rate (of executed)'], [[cases.length, executed.length, cnt(cases, 'PASS'), cnt(cases, 'FAIL'), notExec.length, pct(cnt(cases, 'PASS'), executed.length)]])}
## By level
${group((c) => LV[c.lvl] || c.lvl, 'Level')}
## By technique
${group((c) => c.tech, 'Technique')}
## By requirement prefix
${group((c) => c.prefix, 'Prefix')}
## Failures
${fails.length ? fails.map((c) => `- **${c.id}**: ${(c.failMsgs || []).map(esc).join(' || ') || 'see evidence'}`).join('\n') : 'None.'}

## Not executed
${notExec.length ? table(['ID', 'Level', 'Reason'], notExec.map((c) => [c.id, LV[c.lvl] || c.lvl, c.evidence])) : 'None.'}
## Raw suite totals (straight from the artefacts)
${table(['Suite', 'Tests', 'Failures', 'Skipped', 'Duration'], [
  ['Jest (JUnit)', jT.t, jT.f, jT.k, junitSuites.length ? fmtS(jT.d) : 'n/a'],
  ['Playwright (JSON)', pwT.t, pwT.f, pwT.k, pwStats ? fmtS(pwStats.duration / 1000) : 'n/a'],
])}${pwT.fl ? `Playwright flaky: ${pwT.fl}\n` : ''}
## Coverage (Jest)
${cov ? `Source: ${covSrc}${cov.stmtNote ? ' (lcov has no statement counts; statements shown = lines)' : ''}\n\n- Lines: ${covLine('lines')}\n- Statements: ${covLine('statements')}\n- Functions: ${covLine('functions')}\n- Branches: ${covLine('branches')}` : 'Not available.'}

## Mutation (Stryker)
${mutLine}

## Data sources and caveats
- JUnit: apps/api/reports/junit/*.xml; Playwright: apps/web/test-results/results.json; coverage: ${covSrc || 'n/a'}; mutation: apps/api/reports/mutation/mutation.json; designed cases: 02_Test_Case_Design/Test_Cases.md.
- **File-level mapping caveat:** Jest test names do not carry TC ids and JUnit has no file attribute. Test files are linked to JUnit suites via their describe() titles, and every TC listing a file gets that file's aggregate result. A PASS therefore means "all tests in the file passed", not that the specific TC was individually asserted.
- Playwright TCs are matched individually by title prefix; if a TC runs in several projects (browsers), all must pass.
${notes.length ? '\n## Input notes\n' + notes.map((n) => '- ' + n).join('\n') + '\n' : ''}`);

// 3) Report summary
const ok = (b) => (b ? 'MET' : 'NOT MET');
const thrRows = [];
if (jestThr && cov) for (const [k, v] of Object.entries(jestThr)) if (cov[k]) thrRows.push([`Jest coverage ${k}`, `>= ${v}%`, cov[k].pct.toFixed(2) + '%', ok(cov[k].pct >= v)]);
if (strykerThr && mut) thrRows.push(['Stryker break', `>= ${strykerThr.break}%`, mut.score.toFixed(2) + '%', ok(mut.score >= strykerThr.break)], ['Stryker high (target)', `>= ${strykerThr.high}%`, mut.score.toFixed(2) + '%', ok(mut.score >= strykerThr.high)], ['Stryker low', `>= ${strykerThr.low}%`, mut.score.toFixed(2) + '%', ok(mut.score >= strykerThr.low)]);
const link = (label, p, ex) => (copied(ex) ? `- [${label}](${p})` : `- ${label}: NOT COPIED (source missing)`);
const junitOut = path.join(OUT6, 'junit');
const junitLinks = exists(junitOut) ? fs.readdirSync(junitOut).filter((f) => f.endsWith('.xml')).map((f) => `- [JUnit ${f}](junit/${f})`).join('\n') : '- JUnit: NOT COPIED (source missing)';
write(P('06_Test_Reports/Test_Report_Summary.md'),
`# Test Report Summary

${header}

## Suites run
${table(['Suite', 'Tests', 'Failed', 'Skipped', 'Duration'], [
  ['Jest unit + integration', jT.t, jT.f, jT.k, junitSuites.length ? fmtS(jT.d) : 'not run'],
  ['Playwright E2E (all projects)', pwT.t, pwT.f, pwT.k, pwStats ? fmtS(pwStats.duration / 1000) : 'not run'],
])}
Designed cases: ${cases.length}; executed ${executed.length}; pass ${cnt(cases, 'PASS')}; fail ${cnt(cases, 'FAIL')}; not executed ${notExec.length}; pass rate of executed ${pct(cnt(cases, 'PASS'), executed.length)} (Jest mapping is file-level, see Test_Execution_Summary.md).

## Quality metrics
- Coverage: lines ${covLine('lines')}, branches ${covLine('branches')}, functions ${covLine('functions')}, statements ${covLine('statements')}${cov?.stmtNote ? ' (statements = lines, from lcov)' : ''}
- Mutation score: ${mutLine}

## Thresholds
${thrRows.length ? table(['Threshold', 'Required', 'Actual', 'Status'], thrRows) : 'No thresholds could be evaluated (missing config or data).'}
## Artefacts
${link('Jest coverage', 'jest-coverage/index.html', 'jest-coverage')}
${link('Playwright report', 'playwright-report/index.html', 'playwright-report')}
${link('Mutation report', 'mutation/mutation.html', 'mutation')}
${junitLinks}
${link('Playwright JSON', 'playwright-results.json', 'playwright-results.json')}
${notes.length ? '\n## Notes (missing or problem inputs)\n' + notes.map((n) => '- ' + n).join('\n') + '\n' : ''}`);

if (parseErrors) { console.error(`${parseErrors} parse error(s)`); process.exit(1); }
