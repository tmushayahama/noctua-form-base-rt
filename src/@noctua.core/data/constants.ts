import * as relations from './relations';
import * as workbenches from './workbenches';

declare var global_barista_location: any;
declare var global_minerva_definition_name: any;
declare var global_golr_neo_server: any;
declare var global_golr_server: any;
declare var global_workbenches_universal: any;
declare var global_workbenches_model: any;
declare var global_workbenches_model_beta_test: any;
declare var global_workbenches_universal_beta_test: any;
declare var global_known_relations: any;

const baristaLocation = typeof global_barista_location !== 'undefined' ? global_barista_location : 'http://localhost:3400'; // 'http://barista-dev.berkeleybop.org';
const minervaDefinitionName = typeof global_minerva_definition_name !== 'undefined' ? global_minerva_definition_name : 'minerva_local';
const golrNeoServer = typeof global_golr_neo_server !== 'undefined'
  ? global_golr_neo_server
  : 'http://noctua-golr.berkeleybop.org/';
const golrServer = typeof global_golr_server !== 'undefined'
  ? global_golr_server
  : 'https://golr-aux.geneontology.io/solr/';//'http://golr-aux.geneontology.io/solr/'


const globalWorkbenchesModel = typeof global_workbenches_model !== 'undefined'
  ? global_workbenches_model
  : workbenches.globalWorkbenchesModel;

const globalWorkbenchesUniversal = typeof global_workbenches_universal !== 'undefined'
  ? global_workbenches_universal
  : workbenches.globalWorkbenchesUniversal;

const globalWorkbenchesModelBetaTest = typeof global_workbenches_model_beta_test !== 'undefined'
  ? global_workbenches_model_beta_test
  : workbenches.globalWorkbenchesModelBetaTest;

const globalWorkbenchesUniversalBetaTest = typeof global_workbenches_universal_beta_test !== 'undefined'
  ? global_workbenches_universal_beta_test
  : workbenches.globalWorkbenchesUniversalBetaTest;

const globalKnownRelations = typeof global_known_relations !== 'undefined'
  ? global_known_relations
  : relations.globalKnownRelations;



export const ENVIRONMENT = {
  isDev: import.meta.env.VITE_DEV_MODE === 'true',
  baristaDevUrl: 'http://barista-dev.berkeleybop.org/api/minerva_public_dev/m3Batch/',
  baristaUrl: 'http://localhost:3400/api/minerva_local/m3BatchPrivileged',

  globalGolrNeoServer: golrNeoServer,
  globalGolrServer: golrServer,
  globalMinervaDefinitionName: minervaDefinitionName,
  globalBaristaLocation: baristaLocation,
  globalWorkbenchesModel: globalWorkbenchesModel,
  globalWorkbenchesUniversal: globalWorkbenchesUniversal,
  globalWorkbenchesModelBetaTest: globalWorkbenchesModelBetaTest,
  globalWorkbenchesUniversalBetaTest: globalWorkbenchesUniversalBetaTest,
  globalKnownRelations: globalKnownRelations,
  searchApi: `${baristaLocation}/search/`,

  noctuaUrl: `${window.location.origin}`,
  noctuaLandingPageUrl: `${window.location.origin}/workbench/noctua-landing-page`,

  workbenchUrl: `${window.location.origin}/workbench/`,

  amigoTermUrl: 'http://amigo.geneontology.org/amigo/term/',
  pubmedUrl: 'https://pubmed.ncbi.nlm.nih.gov/',
  pubmedApiUrl: 'https://api.ncbi.nlm.nih.gov/lit/ctxp/v1/pubmed/',
  pubMedSummaryApi: 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&retmode=json&id=',
  evidenceOntologyUrl: 'http://www.evidenceontology.org/term/',
  announcementUrl: 'https://raw.githubusercontent.com/geneontology/noctua-announcements/dev/notification.json',
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
