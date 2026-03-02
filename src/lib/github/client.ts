import { Octokit } from '@octokit/rest'
import { graphql } from '@octokit/graphql'

let _octokit: Octokit | null = null
let _graphql: typeof graphql | null = null
let _currentPat: string | null = null

export function getOctokit(pat: string): Octokit {
  if (!_octokit || pat !== _currentPat) {
    _octokit = new Octokit({ auth: pat })
    _graphql = graphql.defaults({
      headers: { authorization: `token ${pat}` },
    })
    _currentPat = pat
  }
  return _octokit
}

export function getGraphql(pat: string): typeof graphql {
  if (!_graphql || pat !== _currentPat) {
    getOctokit(pat) // ensures both are initialized together
  }
  return _graphql!
}
