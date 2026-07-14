import Store from 'electron-store'

const store = new Store({
  name: 'session',
  defaults: { session: {} },
})

export function getSession() {
  return store.get('session', {})
}

export function saveSession(data) {
  store.set('session', data)
}
