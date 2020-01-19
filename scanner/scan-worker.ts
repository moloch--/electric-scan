import { BrowserWindow, NativeImage, Session } from 'electron';
import { isMainThread, parentPort, workerData } from 'worker_threads';


export const TASK_REQ = 'task-request';
export const TASK_RESULT = 'task-result';
// Screenshot data + metadata
export interface Screenshot {
  target: string;
  image: NativeImage | null;
  error: string;
}

// Result for a single target, but no image data
export interface ScanResult {
  id: string;
  target: string;
  error: string;
}

// Results for the entire scan
export interface Scan {
  id: string;
  name: string;
  results: ScanResult[];
  started: number;
  duration: number;
  width: number;
  height: number;
}


export interface WorkerMsg {
  'type': string,
  'workerId': number,
  'target': string,
}

console.log(`Worker data: ${JSON.stringify(workerData)}`);


async function capture(target: string): Promise<Screenshot> {
  const targetURL = new URL(target);
  // console.log(`Screenshot: ${targetURL.toString()}`);
  if (targetURL.protocol !== 'http:' && targetURL.protocol !== 'https:') {
    return Promise.reject({
      target: targetURL.toString(),
      image: null,
      error: `Invalid protocol '${targetURL.protocol}'`
    });
  }
  let scanWindow = await createScanWindow(workerData.width, workerData.height);
  scanWindow.on('closed', () => {
    scanWindow = null;
  });

  let result: Screenshot;
  try {
    const image = await screenshot(scanWindow, targetURL);
    result = {
      target: targetURL.toString(),
      image: image,
      error: image.isEmpty() ? 'No result' : '',
    };
  } catch (err) {
    result = {
      target: targetURL.toString(),
      image: null,
      error: err.code,
    };
  } finally {
    scanWindow.close();
  }
  return result;
}

async function screenshot(scanWindow: BrowserWindow, targetURL: URL): Promise<NativeImage> {
  return new Promise(async (resolve, reject) => {
    const timeoutErr = setTimeout(() => {
      reject({ code: 'ERR_REQUEST_TIMEOUT' });
    }, workerData.timeout);
    try {
      await scanWindow.loadURL(targetURL.toString());
      console.log(`did-finish-load: ${targetURL.toString()}`);
      clearTimeout(timeoutErr);
      setTimeout(async () => {
        try {
          const image = await scanWindow.capturePage();
          resolve(image);
        } catch (err) {
          reject(err);
        }
      }, workerData.margin);
    } catch (err) {
      reject(err);
    }
  });
}

async function createScanWindow(width: number, height: number): Promise<BrowserWindow> {
  const window = new BrowserWindow({
    width: width,
    height: height,
    show: false,
    webPreferences: {
      sandbox: true,
      webSecurity: true,
      contextIsolation: true,
      webviewTag: false,
      enableRemoteModule: false,
      allowRunningInsecureContent: false,
      nodeIntegration: false,
      nodeIntegrationInWorker: false,
      nodeIntegrationInSubFrames: false,
      nativeWindowOpen: false,
      safeDialogs: true,
    }
  });
  window.webContents.setAudioMuted(true);
  window.webContents.session.on('will-download', (event) => {
    event.preventDefault();
  });
  await configureSession(window.webContents.session);
  return window;
}

async function configureSession(session: Session): Promise<void> {

  // User-agent
  if (workerData.settings.UserAgent && workerData.settings.UserAgent.length) {
    session.setUserAgent(workerData.settings.UserAgent);
  }

  // Disable TLS validation (0 = Accept Cert)
  if (workerData.settings.DisableTLSValidation) {
    session.setCertificateVerifyProc((_, callback) => {
      callback(0);
    });
  }

  // Proxy rules
  await session.setProxy({
    pacScript: null,
    proxyRules: proxyRules(),
    proxyBypassRules: null
  });
}

function proxyRules(): string {
  const proxyRules = [];
  if (workerData.settings.SOCKSProxyEnabled) {
    const socksProxy = new URL('socks5://');
    socksProxy.hostname = workerData.settings.SOCKSProxyHostname;
    socksProxy.port = workerData.settings.SOCKSProxyPort.toString();
    proxyRules.push(socksProxy.toString());
  }
  if (workerData.settings.HTTPProxyEnabled) {
    const httpProxy = `http=${workerData.settings.HTTPProxyHostname}:${workerData.settings.HTTPProxyPort}`;
    proxyRules.push(httpProxy);
  }
  if (workerData.settings.HTTPSProxyEnabled) {
    const httpsProxy = `https=${workerData.settings.HTTPSProxyHostname}:${workerData.settings.HTTPSProxyPort}`;
    proxyRules.push(httpsProxy);
  }
  const rules = proxyRules.join(';');
  if (proxyRules.length) {
    console.log(`[proxy rules] ${rules}`);
  }
  return rules;
}




if (!isMainThread) {

  parentPort.on('message', async (task) => {
    console.log(`Task: ${JSON.stringify(task)}`);

    const screenshot = await capture(task.target);
    console.log(`Completed screenshot for ${screenshot.target}`);
    parentPort.postMessage({
      'type': TASK_REQ,
      'workerId': workerData.id,
    });

  });


  // Ask parent to start sending tasks
  parentPort.postMessage({
    'type': TASK_REQ,
    'workerId': workerData.id,
  });

}
