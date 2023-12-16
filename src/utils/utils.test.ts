import { dealDate, genRandomStr, formatDate, normalizeQuery, getShortenedQuery } from './utils'

describe('test utils', () => {
  it('test the length of return value', () => {
    expect(genRandomStr(5).length).toEqual(5)
  })
  it('return value', () => {
    expect(genRandomStr(5)).toMatch(/^[a-zA-Z0-9]{5}$/)
  })
  test('deal date', () => {
    expect(dealDate('2019年2月19')).toEqual('2019-02-19')
    expect(dealDate('2019年10月29日')).toEqual('2019-10-29')
    expect(dealDate('2019年12月')).toEqual('2019-12')
    expect(dealDate('2019/2/19')).toEqual('2019-02-19')
    expect(dealDate('2019/2')).toEqual('2019-02')
  })
  test('formate date', () => {
    expect(formatDate('27 September 2019', 'YYYY-MM-DD')).toEqual('2019-09-27')
    expect(formatDate('27 September 2019', 'yyyy-MM-dd')).toEqual('2019-09-27')
  })
})
describe('test shortened query', () => {
  it('test shortened query', () => {
    expect(getShortenedQuery('HHG ハートヒートガールズ')).toBe('ハートヒートガールズ')
    expect(getShortenedQuery('hello world ゲーム')).toBe('hello world')
    expect(getShortenedQuery('ゲーム hello world')).toBe('ゲーム')
    expect(getShortenedQuery('Rance5D ひとりぼっちの女の子')).toBe('Rance5D')
    expect(getShortenedQuery('hello ゲーム ゲーム world')).toBe('ゲーム')
    expect(getShortenedQuery('バルドスカイ ゼロ')).toBe('バルドスカイ')
    expect(getShortenedQuery('カオスQueen遼子4 森山由梨＆郁美姉妹併呑編')).toBe('カオスQueen遼子')
    expect(getShortenedQuery('D N ANGEL TV Animation Series 紅の翼')).toBe('D N ANGEL')
  })
  it('test shortened version', () => {
    expect(getShortenedQuery('Branmarker 2')).toBe('Branmarker')
  })
  it('test mixed English and Japanese', () => {
    expect(getShortenedQuery('すてぃーるMyはぁと Rhapsody of moonlight ')).toBe('すてぃーるMyはぁと')
  })
  it('test two short Japanese', () => {
    expect(getShortenedQuery('番外 ソルト編')).toBe('ソルト編')
  })
})

describe('test normalize string', () => {
  it('test normalize query', () => {
    var str = '14 -one & four or the other meaning-'
    expect(normalizeQuery(str)).toBe(str)
    // no search result in bgm and 2dfan
    str = 'グリザイアの果実 -LE FRUIT DE LA GRISAIA-'
    expect(normalizeQuery(str)).toBe('グリザイアの果実')
    expect(normalizeQuery('ＲａｇｎａｒｏｋＩｘｃａ')).toBe('ＲａｇｎａｒｏｋＩｘｃａ')
  })
})
