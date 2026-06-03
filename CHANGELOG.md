# Changelog

## [0.2.0](https://github.com/archfill/stackdesk/compare/v0.1.1...v0.2.0) (2026-06-03)


### Features

* **mcp:** add connection setup guidance to token screen ([d1137d5](https://github.com/archfill/stackdesk/commit/d1137d55432d0b468ee20a920a0219d61c946607))


### Bug Fixes

* **docker:** install corepack via npm before enabling ([4294067](https://github.com/archfill/stackdesk/commit/42940674f96b3b02f0f14408fd3a857c0b0386d8))

## [0.1.1](https://github.com/archfill/stackdesk/compare/v0.1.0...v0.1.1) (2026-06-02)


### Bug Fixes

* **frontend:** regenerate package-lock to add missing optional natives ([d8c13ee](https://github.com/archfill/stackdesk/commit/d8c13ee013cfa75d66cfe52cae0f3413c703fbbb))
* **frontend:** restore @emnapi/core and @emnapi/runtime in package-lock ([78b534e](https://github.com/archfill/stackdesk/commit/78b534ecfc705ea628986033dee9d7770de0b790))

## [0.1.0](https://github.com/archfill/stackdesk/compare/v0.0.1...v0.1.0) (2026-06-02)


### Features

* **auth:** add admin/member roles and user management ([13f2fd5](https://github.com/archfill/stackdesk/commit/13f2fd502c624cbca2862d096648adfd039fc89d))
* **auth:** add user accounts, login sessions, and setup wizard ([26b9397](https://github.com/archfill/stackdesk/commit/26b93979a3471f67d019ca5a5888910a8155a9a5))
* **auth:** persist per-user language preference ([04fb43a](https://github.com/archfill/stackdesk/commit/04fb43aa92e13a01d4cee0c182394dfe856460fa))
* **auth:** require session for all /api/apps endpoints ([ef36b57](https://github.com/archfill/stackdesk/commit/ef36b57cbd62f9060ef518ff8cf6366cf9b85d15))
* **docker:** extend Compose ops and add inspect/logs/host modules ([99e82d7](https://github.com/archfill/stackdesk/commit/99e82d7e90f386e3ecfe55dcda96269de473d6a6))
* **frontend:** add StackDesk brand icon ([44402d9](https://github.com/archfill/stackdesk/commit/44402d9da9a25d6696c22e7501c6fc047044b8a4))
* **i18n:** introduce react-i18next infrastructure (en/ja) ([f0769cc](https://github.com/archfill/stackdesk/commit/f0769cccb2bacef69eae6890a9b2e527e6b037d3))
* **i18n:** localize every screen and add a language toggle ([0c39e34](https://github.com/archfill/stackdesk/commit/0c39e342bccf6e484db1481813a01e748272b3a1))
* **mcp:** add MCP server scaffold with bearer token auth ([8c9ac67](https://github.com/archfill/stackdesk/commit/8c9ac6797f1789dc45b07f09a8f45465b017bd0e))
* **mcp:** expose 9 tools and document MCP endpoint ([a30c65c](https://github.com/archfill/stackdesk/commit/a30c65cc59774cb2d55c588e49fa65ca6653e117))
* **mcp:** per-user MCP tokens issued via the UI, drop MCP_TOKEN env ([62488e8](https://github.com/archfill/stackdesk/commit/62488e8da73eb38bf47faa3f51a6ef74d347c517))
* **ui:** rebuild frontend around an "operator console" aesthetic ([ec4f65c](https://github.com/archfill/stackdesk/commit/ec4f65cee3ad84ce22b992f282b3e013d7767db2))


### Bug Fixes

* **dev:** point browser VITE_API_URL to localhost, not container DNS ([12acc72](https://github.com/archfill/stackdesk/commit/12acc7245fa1278d3ecb77f63551b4b872d06e31))
* **docker:** preserve trailing plain-text log lines at EOF ([e17326a](https://github.com/archfill/stackdesk/commit/e17326a80bedab173235dd52025d9189400c970b))
* **docker:** redact secret-looking env vars from inspect_app output ([0713232](https://github.com/archfill/stackdesk/commit/0713232ac4f01d3da7e3758af2dd8529da391e4d))
* **docker:** stable order for ListComposeApps ([4c082ce](https://github.com/archfill/stackdesk/commit/4c082ce2aef15c48a5ed516f79b7e749f430243c))
* **frontend:** accept VITE_API_URL build-arg for production deployments ([c73854d](https://github.com/archfill/stackdesk/commit/c73854d319e959f5e7f5e21bbfa1f55f1aabf485))
* **frontend:** improve app list polling ([1bb11f0](https://github.com/archfill/stackdesk/commit/1bb11f074721d97d4639c5eab681416871ceddcd))
