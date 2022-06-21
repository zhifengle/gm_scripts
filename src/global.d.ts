declare var Fuse: any;
declare var jschardet: any;
declare var XLSX: any;

declare var GM_setValue: (key: string, value: any) => void;
declare var GM_getValue: (key: string, defaultValue?: any) => any;
declare var GM_listValues: () => string[];
declare var GM_deleteValue: (key: string) => void;
declare var GM_registerMenuCommand: (
  caption: string,
  onClick: Function,
  shortcut?: string
) => void;
declare var GM_addStyle: (style: string) => void;
declare var GM_openInTab: any;
declare var GM_getResourceText: (url: string) => string;
declare var GM_getResourceURL: (url: string) => Blob;
declare var GM_log: (url: string) => void;
declare var GM_notification: (options: {
  text: string;
  title?: string;
  image?: string;
  onClick?: Function;
  onDone?: Function;
}) => any;
declare var GM_addValueChangeListener: (
  name: string,
  callback: (
    name: string,
    oldValue: any,
    newValue: any,
    remote: boolean
  ) => void
) => string;
declare var GM_removeValueChangeListener: (id: string) => void;
declare var unsafeWindow: typeof window;

// declare var bangumiDataURL: string;

// @TODO avoid use global variable
interface Window {
  _parsedEl?: Element | Document;
  gm_val_listen_id?: string;
}
