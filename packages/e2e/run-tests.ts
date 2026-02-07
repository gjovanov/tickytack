const args = process.argv.slice(2)
const testFiles = args.length > 0 ? args : []

const proc = Bun.spawn(
  ['node', 'node_modules/.bin/playwright', 'test', '--config', 'playwright.config.js', '--reporter=line', ...testFiles],
  {
    stdout: 'pipe',
    stderr: 'pipe',
    env: { ...process.env },
  }
)

// Stream stdout and stderr to our process
const [stdout, stderr] = await Promise.all([
  new Response(proc.stdout).text(),
  new Response(proc.stderr).text(),
])

if (stdout) process.stdout.write(stdout)
if (stderr) process.stderr.write(stderr)

const exitCode = await proc.exited
process.exit(exitCode)
