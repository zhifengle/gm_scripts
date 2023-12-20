import { getAliasByName, getHiraganaSubTitle, isEnglishName, isKatakanaName, normalizeEditionName, pairCharsToSpace, replaceCharsToSpace } from "./str";

describe("test str", () => {
  test('test getAlias', () => {
    expect(getAliasByName('グリザイアの果実 -LE FRUIT DE LA GRISAIA-')).toEqual(['グリザイアの果実', 'LE FRUIT DE LA GRISAIA']);
    expect(getAliasByName('凍京NECRO＜トウキョウ・ネクロ＞')).toEqual(['凍京NECRO', 'トウキョウ・ネクロ']);
    expect(getAliasByName('PARTS ─パーツ─')).toEqual(['PARTS', 'パーツ']);
    expect(getAliasByName('ブラック ウルヴス サーガ -ブラッディーナイトメア-')).toEqual(['ブラック ウルヴス サーガ', 'ブラッディーナイトメア']);
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
    expect(getHiraganaSubTitle('凍京NECRO＜トウキョウ・ネクロ＞')).toEqual('');
    expect(getHiraganaSubTitle('ギャラクシーエンジェルII 永劫回帰の刻')).toEqual('永劫回帰の刻');
  })
  it('test remove chars', () => {
    expect(pairCharsToSpace('痕 -きずあと-')).toEqual('痕 きずあと');
    expect(replaceCharsToSpace('いつまでも僕だけのママのままでいて!', '', '!').trim()).toEqual('いつまでも僕だけのママのままでいて')
  })
  it('test name type', () => {
    expect(isKatakanaName('ヴ')).toBe(true);
    expect(isKatakanaName('ヴァージン・トリガー')).toBe(true);
    expect(isKatakanaName('ディー ゾーン')).toBe(true);
    expect(isEnglishName('D.Zone')).toBe(true);
    expect(isEnglishName('Lv-F')).toBe(true);
    expect(isEnglishName('LOVE FOREVER 1 Progress')).toBe(false);
  })
})
