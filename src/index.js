const waService = require('./whatsapp/service');
const renderer = require('./ui/renderer');

async function main() {
  renderer.init();

  await waService.initialize(
    // onQr
    (qr) => {
      renderer.showQr(qr);
    },
    // onReady
    () => {
      renderer.handleReady();
    },
    // onAuth
    () => {
      console.log('Authenticated!');
    }
  );
}

main().catch(err => {
    console.error('Fatal Error:', err);
    process.exit(1);
});
