function doGet(e){if(Utils.get&&Utils.get(e,'parameter.action','')==='health')return out_(ApiGateway.handle({action:'public.health'}));return HtmlService.createTemplateFromFile('Index').evaluate().setTitle(APP_CONFIG.app.name)}
function doPost(e){return out_(ApiGateway.handle(Utils.parse(e&&e.postData?e.postData.contents:'{}',{})))}
function out_(x){return ContentService.createTextOutput(JSON.stringify(x)).setMimeType(ContentService.MimeType.JSON)}
function include_(n){return HtmlService.createHtmlOutputFromFile(n).getContent()}
