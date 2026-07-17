const API_ROUTES = {
  'public.health': { public: true, h: () => ({ status: 'OK', version: APP_CONFIG.app.version, time: Utils.now() }) },
  'auth.login': { public: true, h: (c, p, r) => AuthService.login(p, r.client) },
  'auth.logout': { h: c => AuthService.logout(c) },
  'auth.me': { h: c => cleanUser_(UserRepository.findById(c.userId)) },
  'auth.change-password': { h: (c, p) => AuthService.changePassword(c, p) },
  'quiz.available': { h: () => QuizService.available() },
  'quiz.create': { p: 'quiz.create', h: (c, p) => QuizService.create(c, p) },
  'quiz.add-question': { p: 'quiz.create', h: (c, p) => QuizService.addQuestion(c, p) },
  'quiz.publish': { p: 'quiz.publish', h: (c, p) => QuizService.publish(c, p.quizId) },
  'exam.start': { p: 'exam.start', h: (c, p) => ExamEngine.start(c, p.quizId) },
  'exam.save-answer': { p: 'exam.submit', h: (c, p) => ExamEngine.saveAnswer(c, p) },
  'exam.submit': { p: 'exam.submit', h: (c, p) => ExamEngine.submit(c, p.attemptId) },
  'report.dashboard': { p: 'report.read', h: () => ReportService.dashboard() },
  'notification.send': { p: 'notification.send', h: (c, p) => NotificationService.send(c, p) },
  'system.health': { p: 'system.monitor', h: c => SystemMonitorService.healthCheck(c) }
};
const ApiGateway = Object.freeze({ handle(r) { const st = Date.now(), a = Utils.text(r.action).toLowerCase(), route = API_ROUTES[a], base = { requestId: r.requestId || Utils.id('REQ'), action: a }; try { if (!route) throw AppError.notFound('ไม่พบ API ' + a); const c = route.public ? Object.assign(base, { userId: 'PUBLIC', role: APP_ROLES.GUEST }) : Object.assign(base, AuthService.context(r.token)); if (route.p) PermissionService.require(c, route.p); return { success: true, data: route.h(c, r.payload || {}, r), error: null, meta: { requestId: c.requestId, durationMs: Date.now() - st, time: Utils.now() } }; } catch (e) { const x = AppError.internal(e); return { success: false, data: null, error: { code: x.code, message: x.message, details: x.details }, meta: { requestId: base.requestId, durationMs: Date.now() - st, time: Utils.now() } }; } } });
