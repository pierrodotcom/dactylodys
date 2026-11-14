import { PROJECT_ISSUES_URL } from '$lib/ui/project-links';

/** The issue form of the call for review, in `.github/ISSUE_TEMPLATE/` of the repository. */
export const REVIEW_TEMPLATE_FILE = 'relecture-ergotherapeute.yml';

/** Opens a new issue already filled with the form of the call for review. */
export const REVIEW_ISSUE_URL = `${PROJECT_ISSUES_URL}/new?template=${REVIEW_TEMPLATE_FILE}`;

/** The summary of research the design choices rest on, as published in the repository. */
export const RESEARCH_SUMMARY_URL =
	'https://github.com/pierrodotcom/dactylodys/blob/main/reports/Dactylo%20ludique%20TDAH%20dysgraphie.md';
