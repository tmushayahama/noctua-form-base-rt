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
const minervaDefinitionName = typeof global_minerva_definition_name !== 'undefined' ? global_minerva_definition_name : 'minerva_public_dev';
const golrNeoServer = typeof global_golr_neo_server !== 'undefined'
  ? global_golr_neo_server
  : 'http://noctua-golr.berkeleybop.org/';
const golrServer = typeof global_golr_server !== 'undefined'
  ? global_golr_server
  : 'http://golr-aux.geneontology.io/solr/';//'http://golr-aux.geneontology.io/solr/'

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

export const environment = {

};




export const ENVIRONMENT = {
  isDev: true,
  isBeta: false,
  baristaUrl: 'http://barista-dev.berkeleybop.org/api/minerva_public_dev/m3Batch/',
  baristaLocalUrl: 'http://localhost:3400/api/minerva_local/m3Batch',

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

  //Workbench
  noctuaUrl: `${window.location.origin}`,
  noctuaLandingPageUrl: `${window.location.origin}/workbench/noctua-landing-page`,

  workbenchUrl: `${window.location.origin}/workbench/`,

  amigoTerm: 'http://amigo.geneontology.org/amigo/term/',
  pubMedSummaryApi: 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&retmode=json&id=',
  announcementUrl: 'https://raw.githubusercontent.com/geneontology/noctua-announcements/dev/notification.json'

}
