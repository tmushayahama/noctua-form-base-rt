declare var global_barista_location: any;
declare var global_minerva_definition_name: any;
declare var global_golr_neo_server: any;
declare var global_golr_server: any;

const baristaLocation = typeof global_barista_location !== 'undefined' ? global_barista_location : 'http://localhost:3400';
const minervaDefinitionName = typeof global_minerva_definition_name !== 'undefined' ? global_minerva_definition_name : 'minerva_local';
const golrNeoServer = typeof global_golr_neo_server !== 'undefined'
  ? global_golr_neo_server
  : 'http://noctua-golr.berkeleybop.org/';
const golrServer = typeof global_golr_server !== 'undefined'
  ? global_golr_server
  : 'https://golr-aux.geneontology.io/solr/';

export const ENVIRONMENT = {
  isDev: import.meta.env.VITE_DEV_MODE === 'true',

  globalGolrNeoServer: golrNeoServer,
  globalGolrServer: golrServer,
  globalMinervaDefinitionName: minervaDefinitionName,
  globalBaristaLocation: baristaLocation,

  noctuaUrl: `${window.location.origin}`,

  workbenchUrl: `${window.location.origin}/workbench/`,

  amigoTermUrl: 'http://amigo.geneontology.org/amigo/term/',
  pubmedUrl: 'https://pubmed.ncbi.nlm.nih.gov/',
  pubmedApiUrl: 'https://api.ncbi.nlm.nih.gov/lit/ctxp/v1/pubmed/',
  evidenceOntologyUrl: 'http://www.evidenceontology.org/term/',
}

export const EXTERNAL_LINKS = {
  GO_HELP: 'http://help.geneontology.org',
  OBO_FOUNDRY: 'http://www.obofoundry.org/',
  NIH_GRANT: 'https://projectreporter.nih.gov/project_info_details.cfm?aid=9209989',
  GO_ONTOLOGY_ISSUES: 'https://github.com/geneontology/go-ontology/issues',
  NOCTUA_USERS_GUIDE: 'https://docs.google.com/document/d/1a5YZBJrnJ9LKJxPVpXk62dJJGpHB2b9zH8-xr_Rm1Vs',
  GO_HOMEPAGE: 'http://geneontology.org/',
  ALLIANCE_GENOME: 'https://www.alliancegenome.org',
  NOCTUA_PRODUCTION: 'http://noctua.geneontology.org/',
}
