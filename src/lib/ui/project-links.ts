/**
 * The public repository of the project, where the source code is offered to everyone who uses the
 * game (AGPL). It keeps its technical name whatever the name of the app shown to people (ADR-055).
 */
export const PROJECT_REPOSITORY_URL = 'https://github.com/pierrodotcom/dactylodys';

/** Where people report a problem: the issues of the repository. */
export const PROJECT_ISSUES_URL = `${PROJECT_REPOSITORY_URL}/issues`;

const PUBLISHED_BRANCH = `${PROJECT_REPOSITORY_URL}/blob/main`;

/** The text of the license of the code, as published in the repository. */
export const PROJECT_LICENSE_URL = `${PUBLISHED_BRANCH}/LICENSE`;

/** Every third-party resource and contribution, file by file, as published in the repository. */
export const PROJECT_ATTRIBUTIONS_URL = `${PUBLISHED_BRANCH}/static/ATTRIBUTIONS.md`;

/**
 * Who serves the files of the published game, named on the privacy page: to change with the
 * deployment (`.github/workflows/deploy.yml`).
 */
export const PROJECT_HOST = { service: 'GitHub Pages', company: 'GitHub' } as const;
