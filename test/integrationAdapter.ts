import path from 'node:path';
import { expect } from 'chai';
import { tests } from '@iobroker/testing';
import { createFixture } from './fixtures';
import { MockBridge } from './integration/mockBridge';

const APP_KEY = 'test-app-key';

/**
 * Wait until a condition is fulfilled
 *
 * @param condition function returning a truthy value when done
 * @param timeout maximum time to wait in ms
 */
async function waitFor<T>(condition: () => Promise<T> | T, timeout = 10_000): Promise<NonNullable<T>> {
    const start = Date.now();
    for (;;) {
        const result = await condition();
        if (result) {
            return result;
        }
        if (Date.now() - start > timeout) {
            throw new Error('Timeout while waiting for condition');
        }
        await new Promise(resolve => setTimeout(resolve, 100));
    }
}

// Run tests
tests.integration(path.join(__dirname, '..'), {
    defineAdditionalTests({ suite }) {
        suite('Communication with a (simulated) Hue bridge', getHarness => {
            const bridge = new MockBridge(createFixture(), APP_KEY);
            let address: string;
            let harness: ReturnType<typeof getHarness>;

            const getState = (id: string): Promise<ioBroker.State | null> => harness.states.getState(`hue-v2.0.${id}`);
            const getObject = (id: string): Promise<ioBroker.Object | null> =>
                harness.objects.getObject(`hue-v2.0.${id}`);

            before(async function () {
                this.timeout(60_000);
                address = await bridge.start();
                harness = getHarness();

                await harness.changeAdapterConfig('hue-v2', { native: { bridge: address, user: APP_KEY } });
                await harness.startAdapterAndWait(true);
                await waitFor(() => bridge.connectedStreams > 0);
            });

            after(async () => {
                await bridge.stop();
            });

            it('creates objects and initial states', async () => {
                // the instance object is named like the bridge
                const instance = await harness.objects.getObject('hue-v2.0');
                expect(instance?.type).to.equal('device');
                expect(instance?.common.name).to.equal('Hue Upstairs');

                const on = await getObject('lights.Desk.on');
                expect(on?.common).to.include({ role: 'switch.light', type: 'boolean', write: true });

                expect((await getState('lights.Desk.brightness'))?.val).to.equal(50);
                expect((await getState('lights.Desk.colorTemperature'))?.val).to.equal(2732);
                expect((await getState('lights.Hall.reachable'))?.val).to.equal(false);
                expect((await getState('sensors.Door.open'))?.val).to.equal(true);
                expect((await getState('sensors.Corridor_sensor.illuminance'))?.val).to.equal(100);
                expect((await getState('rooms.Living_room.activeScene'))?.val).to.equal('Bright');
                expect((await getState('rooms.Living_room.allOn'))?.val).to.equal(false);
                expect((await getState('info.connection'))?.val).to.equal(true);
            });

            it('sends commands to the bridge and acknowledges them', async () => {
                await harness.states.setState('hue-v2.0.lights.Desk.brightness', { val: 20, ack: false });

                const request = await waitFor(() =>
                    bridge.requests.find(r => r.method === 'PUT' && r.path === '/clip/v2/resource/light/light-desk'),
                );
                expect(request.body).to.deep.equal({ dimming: { brightness: 20 }, on: { on: true } });

                await waitFor(async () => (await getState('lights.Desk.brightness'))?.ack);
                expect((await getState('lights.Desk.brightness'))?.val).to.equal(20);
            });

            it('updates states from the event stream', async () => {
                bridge.emit('update', [
                    {
                        id: 'motion-1',
                        type: 'motion',
                        motion: { motion: true, motion_report: { changed: new Date().toISOString(), motion: true } },
                    },
                    { id: 'light-hall', type: 'light', on: { on: true } },
                ]);

                await waitFor(async () => (await getState('sensors.Corridor_sensor.motion'))?.val === true);
                // the group state depends on the member lights
                await waitFor(async () => (await getState('rooms.Living_room.allOn'))?.val === true);
            });

            it('reconnects the event stream and resynchronizes', async function () {
                this.timeout(20_000);
                const fullSyncs = (): number =>
                    bridge.requests.filter(r => r.method === 'GET' && r.path === '/clip/v2/resource').length;
                const syncsBefore = fullSyncs();

                // a change which happens while the adapter is disconnected
                bridge.setResources(
                    createFixture().map(r => (r.id === 'light-desk' ? { ...r, on: { on: false } } : r)),
                );
                bridge.dropStreams();

                await waitFor(() => bridge.connectedStreams > 0, 15_000);
                await waitFor(() => fullSyncs() > syncsBefore, 15_000);
                await waitFor(async () => (await getState('lights.Desk.on'))?.val === false);
                // the connection is reported at the end of the resync, after all states have been written
                await waitFor(async () => (await getState('info.connection'))?.val === true);
            });
        });
    },
});
