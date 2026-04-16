import { IFetchOpts } from '../interface/types';

// support GM_XMLHttpRequest
const ENV_FLAG = '__ENV_EXT__';

type IAjaxType = 'text' | 'json' | 'blob' | 'arraybuffer';

let retryCounter = 0;

let USER_SITE_CONFIG: Record<string, IFetchOpts> = {};

export function addSiteOption(host: string, config: IFetchOpts) {
  USER_SITE_CONFIG[host] = config;
}

export function setOption(config: IFetchOpts) {
  USER_SITE_CONFIG = config;
}

function getSiteConfg(url: string, host?: string): IFetchOpts {
  let hostname = host;
  if (!host) {
    hostname = new URL(url)?.hostname;
  }
  const config = USER_SITE_CONFIG[hostname] || {};
  return config;
}

function mergeOpts(opts: IFetchOpts, config: IFetchOpts): IFetchOpts {
  return {
    ...opts,
    ...config,
    headers: {
      ...opts?.headers,
      ...config?.headers,
    },
  };
}

export function fetchInfo(
  url: string,
  type: IAjaxType,
  opts: IFetchOpts = {},
  TIMEOUT = 10 * 1000
): Promise<any> {
  const method = opts?.method?.toUpperCase() || 'GET';
  opts = mergeOpts(opts, getSiteConfg(url));
  // @ts-ignore
  if (ENV_FLAG === '__ENV_GM__') {
    const gmXhrOpts = { ...opts };
    if (method === 'POST' && gmXhrOpts.body) {
      gmXhrOpts.data = gmXhrOpts.body;
    }
    if (opts.decode) {
      type = 'arraybuffer';
    }
    return new Promise((resolve, reject) => {
      // @ts-ignore
      GM_xmlhttpRequest({
        method,
        timeout: TIMEOUT,
        url,
        responseType: type,
        onload: function (res: any) {
          if (res.status === 404) {
            retryCounter = 0;
            reject(404);
          } else if (res.status === 302 && retryCounter < 5) {
            retryCounter++;
            resolve(fetchInfo(res.finalUrl, type, opts, TIMEOUT));
          }
          if (opts.decode && type === 'arraybuffer') {
            retryCounter = 0;
            let decoder = new TextDecoder(opts.decode);
            resolve(decoder.decode(res.response));
          } else {
            retryCounter = 0;
            resolve(res.response);
          }
        },
        onerror: (e: any) => {
          retryCounter = 0;
          reject(e);
        },
        ontimeout: (e: any) => {
          retryCounter = 0;
          reject(e || new Error(`request timeout: ${url}`));
        },
        ...gmXhrOpts,
      });
    });
  }
  if (method === 'POST' && opts.data) {
    opts.body = opts.data;
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT);
  return fetch(url, {
    method,
    // credentials: 'include',
    // mode: 'cors',
    // cache: 'default',
    ...opts,
    signal: opts.signal || controller.signal,
  }).finally(() => clearTimeout(timer)).then(
    (response) => {
      if (response.status === 302 && retryCounter < 5) {
        retryCounter++;
        return fetchInfo(response.url, type, opts, TIMEOUT);
      } else if (response.ok) {
        retryCounter = 0;
        if (opts.decode) {
          return response.arrayBuffer().then((buffer: ArrayBuffer) => {
            let decoder = new TextDecoder(opts.decode);
            let text = decoder.decode(buffer);
            return text;
          });
        }
        if (type === 'arraybuffer') {
          return response.arrayBuffer();
        }
        return response[type]();
      }
      retryCounter = 0;
      throw new Error('Not 2xx response');
    },
    (err) => console.log('fetch err: ', err)
  );
}

export function fetchBinary(url: string, opts: IFetchOpts = {}): Promise<Blob> {
  return fetchInfo(url, 'blob', opts);
}

export function fetchText(
  url: string,
  opts: IFetchOpts = {},
  TIMEOUT = 10 * 1000
): Promise<string> {
  return fetchInfo(url, 'text', opts, TIMEOUT);
}
export function fetchJson(url: string, opts: IFetchOpts = {}): Promise<any> {
  return fetchInfo(url, 'json', opts);
}
