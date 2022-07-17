type Torrent = {
  title: string;
  category?: string;
  description?: string;
  link: string;
  magnet: string;
  size?: string;
  pubDate?: string;
  seeders?: number;
  leechers?: number;
  downloads?: number;
};

export function genFullMagnetLink(
  magnet: string,
  name: string,
  trList: string[]
): string {
  const params = new URLSearchParams({ dn: name });
  trList.forEach((tr) => {
    params.append('tr', tr);
  });
  return `${magnet}&${params.toString()}`;
}

export function getTorrents(): Torrent[] {
  const results: Torrent[] = [];
  document.querySelectorAll('.container table > tbody > tr').forEach((el) => {
    const $link = el.querySelector('a[href^="/view"]') as HTMLAnchorElement;
    const t: Torrent = {
      title: $link.textContent,
      link: $link.href,
      magnet: '',
      size: el.querySelector('td:nth-child(4)').textContent,
      pubDate: el.querySelector('td:nth-child(5)').textContent,
      seeders: +el.querySelector('td:nth-child(5)').textContent,
      leechers: +el.querySelector('td:nth-child(6)').textContent,
      downloads: +el.querySelector('td:nth-child(7)').textContent,
    };
    t.magnet = (
      el.querySelector(
        'td:nth-child(3) > a[href^="magnet"]'
      ) as HTMLAnchorElement
    ).href.replace(/&dn=.*$/, '');
    results.push(t);
  });
  return results;
}
