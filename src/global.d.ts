declare var Fuse: any;

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
declare var GM_log: (url: string) => void;
declare var GM_notification: (options: {
  text: string;
  title?: string;
  image?: string;
  onClick: Function;
  onDone: Function;
}) => any;

// declare var bangumiDataURL: string;

// @TODO avoid use global variable
interface Window {
  _parsedEl: Element | Document;
}
