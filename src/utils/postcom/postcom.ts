// https://github.com/dollarshaveclub/postmate/blob/master/src/postmate.js

const MESSAGE_TYPE = 'application/x-postcom-v1+json';

const MAX_HANDSHAKE_REQUESTS = 5;

let _messageId = 0;

const generateNewMessageId = () => ++_messageId;

enum MessageCode {
  Handshake = 1,
  HandshakeReply,
  Call,
  Emit,
  Reply,
  Request,
}

type IMessage = {
  type: typeof MESSAGE_TYPE;
  uid: number;
  code: MessageCode;
  data: any;
};

function isValidMessageEvent(event: MessageEvent, origin: string) {
  if (event.origin !== origin) {
    return false;
  }
  if (
    !event ||
    !event.data ||
    event.data.type !== MESSAGE_TYPE ||
    typeof event.data.code !== 'number'
  ) {
    return false;
  }
  return true;
}

export class PostCom {
  iframe: HTMLIFrameElement;
  child: WindowProxy;
  parent: WindowProxy;
  constructor(
    container: HTMLElement = document.body,
    url: string,
    name: string = 'post-com'
  ) {
    this.iframe = document.createElement('iframe');
    this.iframe.name = name;
    this.parent = window;
    this.child = this.iframe.contentWindow;
    container.appendChild(this.iframe);
  }
  send(url: string) {
    let counter = 0;
    let responseInterval: ReturnType<typeof setInterval>;
    const origin = new URL(url).origin;
    return new Promise((resolve, reject) => {
      const reply = (e: MessageEvent) => {
        if (isValidMessageEvent(e, origin)) {
          return;
        }
        if (e.data.code === 1) {
          clearInterval(responseInterval);
          this.parent.removeEventListener('message', reply);
          // @TODO resolve
          resolve({});
        }
        reject('Failed handshake');
      };
      this.parent.addEventListener('message', reply);
    });
  }
}
