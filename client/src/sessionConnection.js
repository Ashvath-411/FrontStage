const heartbeatMs = 30000;
const refetchMs = 10000;

export function keepNewestState(current, fresh) {
  if (!current || fresh.state.version >= current.state.version) return fresh;
  return { ...fresh, state: current.state };
}

function applyState(current, state) {
  if (!current || state.version < current.state.version) return current;
  return { ...current, state };
}

function listenToSession(socket, sessionId, handlers) {
  const { setSession } = handlers;
  socket.on('connect', () => {
    handlers.setConnected(true);
    socket.emit('join-room', sessionId);
    handlers.refetch();
  });
  socket.on('disconnect', () => handlers.setConnected(false));
  socket.on('state', (state) => setSession((current) => applyState(current, state)));
  socket.on('participants', (participants) => setSession((current) => current && { ...current, participants }));
  socket.on('settings', (settings) => setSession((current) => current && { ...current, ...settings }));
  socket.on('snapshot', (snapshot) => setSession((current) => current && { ...current, snapshot }));
  socket.on('ended', () => handlers.refetch());
  socket.on('kicked', () => {
    handlers.setKicked(true);
    socket.disconnect();
  });
}

export function openSessionConnection(sessionId, createSocket, handlers, page = document) {
  const socket = createSocket();
  listenToSession(socket, sessionId, handlers);
  const refetchWhenVisible = () => {
    if (page.visibilityState === 'visible') handlers.refetch();
  };
  const heartbeat = setInterval(() => socket.emit('hb'), heartbeatMs);
  const poll = setInterval(refetchWhenVisible, refetchMs);
  page.addEventListener('visibilitychange', refetchWhenVisible);
  handlers.refetch();
  return function closeConnection() {
    clearInterval(heartbeat);
    clearInterval(poll);
    page.removeEventListener('visibilitychange', refetchWhenVisible);
    socket.removeAllListeners();
    socket.close();
  };
}
