function getLMSLiveness_(){return{alive:true,name:APP_CONFIG.app.name,version:APP_CONFIG.app.version,time:Utils.now()}}
function getLMSReadiness_(){try{DB.ss();StorageService.root();return{ready:true,time:Utils.now()}}catch(e){return{ready:false,error:e.message,time:Utils.now()}}}
