import { render } from 'preact'
import { App } from './app'
import './styles.css'

const root = document.getElementById('app')
if (root) {
	render(<App />, root)
}

function registerServiceWorker() {
	window.addEventListener('load', () => {
		void navigator.serviceWorker
			.register('/sw.js', { updateViaCache: 'none' })
			.then((registration) => registration.update())
			.catch(() => undefined)
	})
}

if ('serviceWorker' in navigator && import.meta.env.PROD) {
	registerServiceWorker()
}
