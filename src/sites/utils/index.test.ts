import { getAlias, getHiraganaSubTitle, normalizeEditionName } from "./str";

describe("test str", () => {
  test('test getAlias', () => {
    expect(getAlias('グリザイアの果実 -LE FRUIT DE LA GRISAIA-')).toEqual(['グリザイアの果実', 'LE FRUIT DE LA GRISAIA']);
    expect(getAlias('凍京NECRO＜トウキョウ・ネクロ＞')).toEqual(['凍京NECRO', 'トウキョウ・ネクロ']);
    expect(getAlias('PARTS ─パーツ─')).toEqual(['PARTS', 'パーツ']);
    expect(getAlias('ブラック ウルヴス サーガ -ブラッディーナイトメア-')).toEqual(['ブラック ウルヴス サーガ', 'ブラッディーナイトメア']);
  })
  it('test normalize edition query', () => {
    expect(normalizeEditionName('ずっとすきして たくさんすきして パッケージ版')).toBe('ずっとすきして たくさんすきして')
    expect(normalizeEditionName('ずっとすきして たくさんすきして ダウンロード版')).toBe('ずっとすきして たくさんすきして')
    expect(normalizeEditionName('ずっとすきして たくさんすきして 体験版')).toBe('ずっとすきして たくさんすきして')
    expect(normalizeEditionName('チュートリアルサマー DVDPG')).toBe('チュートリアルサマー')
  })
  it('test getHiraganaSubTitle', () => {
    expect(getHiraganaSubTitle('フィギュア ～奪われた放課後～')).toEqual('奪われた放課後');
    expect(getHiraganaSubTitle('巨乳ファンタジー外伝２after -リュート、古代ローマに行く-')).toEqual('リュート、古代ローマに行く');
  })
})
