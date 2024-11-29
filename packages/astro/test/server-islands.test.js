import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import * as cheerio from 'cheerio';
import testAdapter from './test-adapter.js';
import { loadFixture } from './test-utils.js';

describe('Server islands', () => {
	describe('SSR', () => {
		/** @type {import('./test-utils').Fixture} */
		let fixture;
		before(async () => {
			fixture = await loadFixture({
				root: './fixtures/server-islands/ssr',
				adapter: testAdapter(),
			});
		});

		describe('dev', () => {
			let devServer;

			before(async () => {
				process.env.ASTRO_KEY = 'eKBaVEuI7YjfanEXHuJe/pwZKKt3LkAHeMxvTU7aR0M=';
				devServer = await fixture.startDevServer();
			});

			after(async () => {
				await devServer.stop();
				delete process.env.ASTRO_KEY;
			});

			it('omits the islands HTML', async () => {
				const res = await fixture.fetch('/');
				assert.equal(res.status, 200);
				const html = await res.text();
				const $ = cheerio.load(html);
				const serverIslandEl = $('h2#island');
				assert.equal(serverIslandEl.length, 0);
			});

			it('island can set headers', async () => {
				const res = await fixture.fetch('/_server-islands/Island', {
					method: 'POST',
					body: JSON.stringify({
						componentExport: 'default',
						encryptedProps: 'FC8337AF072BE5B1641501E1r8mLIhmIME1AV7UO9XmW9OLD',
						slots: {},
					}),
				});
				const works = res.headers.get('X-Works');
				assert.equal(works, 'true', 'able to set header from server island');
			});
		});

		describe('prod', () => {
			before(async () => {
				process.env.ASTRO_KEY = 'eKBaVEuI7YjfanEXHuJe/pwZKKt3LkAHeMxvTU7aR0M=';
				await fixture.build();
			});

			after(async () => {
				delete process.env.ASTRO_KEY;
			});

			it('omits the islands HTML', async () => {
				const app = await fixture.loadTestAdapterApp();
				const request = new Request('http://example.com/');
				const response = await app.render(request);
				const html = await response.text();

				const $ = cheerio.load(html);
				const serverIslandEl = $('h2#island');
				assert.equal(serverIslandEl.length, 0);

				const serverIslandScript = $('script[data-island-id]');
				assert.equal(serverIslandScript.length, 1, 'has the island script');
			});
		});
	});

	describe('Hybrid mode', () => {
		/** @type {import('./test-utils').Fixture} */
		let fixture;
		before(async () => {
			fixture = await loadFixture({
				root: './fixtures/server-islands/hybrid',
			});
		});

		describe('build', () => {
			before(async () => {
				await fixture.build({
					adapter: testAdapter(),
				});
			});

			it('Omits the island HTML from the static HTML', async () => {
				let html = await fixture.readFile('/client/index.html');

				const $ = cheerio.load(html);
				const serverIslandEl = $('h2#island');
				assert.equal(serverIslandEl.length, 0);

				const serverIslandScript = $('script[data-island-id]');
				assert.equal(serverIslandScript.length, 1, 'has the island script');
			});
		});

		describe('build (no adapter)', () => {
			it('Errors during the build', async () => {
				try {
					await fixture.build({
						adapter: undefined,
					});
					assert.equal(true, false, 'should not have succeeded');
				} catch (err) {
					assert.equal(err.title, 'Cannot use Server Islands without an adapter.');
				}
			});
		});
	});
});