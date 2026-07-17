const QuizService=Object.freeze({
  create(c,p){PermissionService.requireAny(c,['quiz.create','system.manage']);return QuizRepository.insert(Object.assign({published:false,attemptLimit:1,passPercentage:50},p),{actorId:c.userId})},
  addQuestion(c,p){PermissionService.requireAny(c,['quiz.create','quiz.update','system.manage']);return QuestionRepository.insert(p,{actorId:c.userId})},
  publish(c,id){PermissionService.requireAny(c,['quiz.publish','system.manage']);return QuizRepository.update(id,{published:true},{actorId:c.userId})},
  available(){const n=new Date();return QuizRepository.findMany({published:true}).filter(q=>(!q.openAt||new Date(q.openAt)<=n)&&(!q.closeAt||new Date(q.closeAt)>=n))},
  pack(id){const q=QuizRepository.findById(id);if(!q)throw AppError.notFound('ไม่พบข้อสอบ');return{quiz:q,questions:QuestionRepository.findMany({quizId:id}).filter(x=>x.status===APP_STATUSES.ACTIVE).sort((a,b)=>Utils.int(a.sortOrder)-Utils.int(b.sortOrder))}}
});
