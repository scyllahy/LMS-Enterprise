const ExamEngine = Object.freeze({
  start(c, quizId) {
    PermissionService.require(c, 'exam.start');
    const st = StudentRepository.findOne({ userId: c.userId });
    if (!st) throw AppError.notFound('ไม่พบข้อมูลนักเรียน');
    const p = QuizService.pack(quizId), q = p.quiz, now = new Date();
    if (!q.published || (q.openAt && new Date(q.openAt) > now) || (q.closeAt && new Date(q.closeAt) < now)) throw AppError.permission('ข้อสอบยังไม่เปิดหรือปิดรับคำตอบแล้ว');
    const active = AttemptRepository.findOne({ quizId, studentId: st.studentId, examStatus: EXAM_STATUSES.IN_PROGRESS });
    if (active) throw AppError.conflict('มีการสอบที่กำลังดำเนินอยู่');
    const used = AttemptRepository.findMany({ quizId, studentId: st.studentId }).filter(a => a.examStatus !== EXAM_STATUSES.IN_PROGRESS).length;
    if (q.attemptLimit && used >= Utils.int(q.attemptLimit)) throw AppError.conflict('ใช้สิทธิ์ทำข้อสอบครบแล้ว');
    const end = q.timeLimitMinutes ? new Date(now.getTime() + Utils.int(q.timeLimitMinutes) * 60000) : null;
    const a = AttemptRepository.insert({ quizId, studentId: st.studentId, sessionId: c.sessionId, examStatus: EXAM_STATUSES.IN_PROGRESS, startedAt: now.toISOString(), endsAt: end ? end.toISOString() : '', submittedAt: '', score: 0, maximumScore: p.questions.reduce((s, x) => s + Utils.num(x.score), 0), percentage: 0, riskScore: 0, metadataJson: {} }, { actorId: c.userId });
    return { attempt: a, quiz: q, questions: p.questions.map(question => { const x = Object.assign({}, question); delete x.correctAnswerJson; return x; }) };
  },
  saveAnswer(c, p) {
    p = requireObject_(p);
    const a = ownedAttempt_(c, p.attemptId);
    if (a.examStatus !== EXAM_STATUSES.IN_PROGRESS) throw AppError.conflict('การสอบสิ้นสุดแล้ว');
    if (a.endsAt && new Date(a.endsAt) <= new Date()) return this.submit(c, a.attemptId, 'TIME_EXPIRED');
    const q = QuestionRepository.findById(p.questionId);
    if (!q || String(q.quizId) !== String(a.quizId)) throw AppError.validation('คำถามไม่อยู่ในข้อสอบนี้');
    const old = AnswerRepository.findOne({ attemptId: a.attemptId, questionId: q.questionId });
    const d = { attemptId: a.attemptId, questionId: q.questionId, answerJson: p.answerJson || {}, savedAt: Utils.now(), metadataJson: p.metadataJson || {} };
    return old ? AnswerRepository.update(old.answerId, d, { actorId: c.userId }) : AnswerRepository.insert(d, { actorId: c.userId });
  },
  submit(c, id, reason) {
    const a = ownedAttempt_(c, id);
    if (a.examStatus !== EXAM_STATUSES.IN_PROGRESS) throw AppError.conflict('ส่งข้อสอบนี้แล้ว');
    AttemptRepository.update(id, { examStatus: reason === 'TIME_EXPIRED' ? EXAM_STATUSES.AUTO_SUBMITTED : EXAM_STATUSES.SUBMITTED, submittedAt: Utils.now() }, { actorId: c.userId });
    return ScoringService.autoGrade(c, id);
  },
  autoSubmit(c, id) { return this.submit(c, id, 'TIME_EXPIRED'); }
});

function ownedAttempt_(c, id) {
  const a = AttemptRepository.findById(id);
  if (!a) throw AppError.notFound('ไม่พบการสอบ');
  if (c.role === APP_ROLES.STUDENT) {
    const st = StudentRepository.findOne({ userId: c.userId });
    if (!st || String(a.studentId) !== String(st.studentId)) throw AppError.permission();
  } else PermissionService.requireAny(c, ['exam.grade', 'system.manage']);
  return a;
}
