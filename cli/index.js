#!/usr/bin/env node

const { ci, branch, platform } = require('ci-env')

const { flags, baseBranch, name } = require('./src/pipeline/config')
const files = require('./src/pipeline/files')
const markDuplicates = require('./src/pipeline/mark-duplicates')
const analyse = require('./src/pipeline/analyse')
const cache = require('./src/pipeline/cache')

const cli = require('./src/reporters/cli')
const github = require('./src/reporters/github')
const build = require('./src/reporters/build')
const summarize = require('./src/utils/summarize')

const run = async () => {
  const results = analyse(markDuplicates(files))
  console.log('CI status', ci, branch, baseBranch)
  const cachedResults = await cache.read({ name })
  if (ci && branch === baseBranch && !process.env.INTERNAL_SKIP_CACHE) {
    await cache.save(results)
  }

  const summary = summarize(results, cachedResults, { baseBranch, name })
  cli.report(summary)

  if (ci && flags.enableGitHubChecks) {
    const summaryWithoutColors = summarize(results, cachedResults, {
      colors: false,
      baseBranch,
      name,
    })
    await github.report(summaryWithoutColors)
  }
  build.report(summary)
}

try {
  run()
} catch (err) {
  build.error(err)
}
