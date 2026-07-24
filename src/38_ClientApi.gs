function apiCall(action,payload,token){return JSON.parse(JSON.stringify(ApiGateway.handle({action,payload:payload||{},token:token||''})))}
function getInitialData(){return{app:APP_CONFIG.app,schoolName:Props.get('SCHOOL_NAME','โรงเรียนสระแก้ว'),ready:true}}
