/// <reference lib="webworker" />

import * as IPCIDR from 'ip-cidr';

const MIN_MASK = 15;

function unique(targets: string[]): string[] {
  return targets.filter((elem, index, self) => {
    return index === self.indexOf(elem);
  });
}

addEventListener('message', ({ data }) => {
  console.log(`parsing raw targets: ${data}`);

  const targets = (<string> data).split('\n')
    .map(target => target.trim())
    .map(target => target.toLowerCase())
    .filter(target => target.length);

  let allTargets: string[] = [];
  let errors: Error[] = [];
  for (let index = 0; index < targets.length; ++index) {
    let target = targets[index];
    let targetUri: URL;
    if (target.startsWith('http://') || target.startsWith('https://')) {
      targetUri = new URL(target);
    } else {
      targetUri = new URL(`http://${target}`);
    }
    let targetCidr = `${targetUri.hostname}${targetUri.pathname}`;
    console.log(`check cidr: ${targetCidr} from '${targetUri}' (${target})`);
    const cidr = new IPCIDR(targetCidr);
    if (cidr.isValid()) {
      if (targetCidr.indexOf('/') === -1) {
        allTargets.push(target);  // Plain IP address, no mask
        continue;
      }
      const mask = Number(targetCidr.split('/')[1]);
      if (mask && MIN_MASK < mask) {
        let ips: string[] = cidr.toArray();
        ips = ips.map((ip) => {
          targetUri.hostname = ip;
          return targetUri.toString();
        });
        allTargets = allTargets.concat(ips);
      } else if (mask && mask <= MIN_MASK) {
        errors.push(new Error(`Network mask /${mask} is too large`));
      } else {
        errors.push(new Error(`Invalid network mask`))
      }
    } else {
      allTargets.push(targets[index]);
    }
  }

  // Check to see if everything has "http:" or "https:" prefix since
  // an HTTP 302 -> https: is probably a thing we default to http:
  for (let index = 0; index < allTargets.length; ++index) {
    if (allTargets[index].startsWith('http://') || allTargets[index].startsWith('https://')) {
      continue;
    }
    allTargets[index] = `http://${allTargets[index]}`;
  }
  allTargets = unique(allTargets);
  postMessage({targets: allTargets, errors: errors});
});
