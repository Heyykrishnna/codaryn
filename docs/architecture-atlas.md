# Architecture atlas

In Studio, choose a connected repository and commit, then select **Create manifest and start analysis**. Use **Track analysis and open graph** to follow the job. Analysis jobs run in the analysis worker. Graph opens the latest completed run by default, and the repository selector scopes the run list to a single repository. Each run is pinned to one commit in one repository.

The Graph page provides five related views and Code Health. Services groups files by detected manifest roots and directory conventions. Features shows detected routes, components and inferred source folders. API Sequences follows declared middleware and handlers. File Dependencies shows stored import evidence. Function Flowcharts uses static control flow and call evidence from an execution snapshot. Select **Extract function flowcharts** to queue the execution artifact if it has not been generated, then refresh the snapshot.

Use the baseline picker to compare the visible nodes and relationships with another completed run from the same repository. The comparison is bounded by the displayed evidence and can omit changes outside that sample. The rules panel accepts path prefixes in plain JSON. It checks imports and re-exports on the dependency layer and resolved calls on the function layer.

```json
{
  "rules": [
    {
      "name": "UI cannot import storage",
      "kind": "imports",
      "from": "apps/web",
      "to": "packages/database"
    }
  ]
}
```

Rules remain in the current browser view. The guided tour orders detected routes by incoming import links to their files and excludes test and migration paths. File inventory recognizes JavaScript, TypeScript, Python, Java, Kotlin, Go, Rust, Ruby, PHP, Swift, Dart and C#. Detailed static analysis currently uses the existing JavaScript and TypeScript adapters. Manifest and directory groupings are structural evidence of repository units. They cannot verify deployment boundaries or runtime behavior.

## API workbench

Open **API workbench** from a completed atlas to load the detected route catalog. Set `NEXT_PUBLIC_WORKBENCH_ORIGINS` to a comma-separated list of approved HTTPS or WSS origins when building and running the web application. Development also accepts loopback HTTP and WS origins. HTTP test servers must allow the Codaryn origin with CORS. The workbench sends HTTP requests directly from the browser, omits cookies, rejects redirects, and keeps bearer tokens in page memory.

Import request templates from OpenAPI, Postman, or Insomnia JSON. Review paths and bodies before sending. Imported templates omit credentials and scripts. The chain runner executes up to eight requests in order and supports `{{response.field}}` references to the previous JSON response. Select the event stream response format for SSE or a WSS origin for WebSocket messages. Request time and response previews are bounded. Bearer tokens obtained elsewhere can be pasted into the workbench.

The response assertions panel accepts one Postman-style status check per line, such as `pm.test("OK", () => { pm.response.to.have.status(200); });`. Codaryn parses these assertions and reports pass or fail. General JavaScript and imported Postman scripts are outside the supported syntax.
