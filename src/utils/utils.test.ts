import { dealDate, genRandomStr, formatDate, replaceCharToSpace, normalizeQuery } from './utils'

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

describe('test normalize string', () => {
  it('test normalize query', () => {
    // @TODO
  })
  it('test replace char to space', () => {
    // 'CROSS†CHANNEL'
    const removeSpace = (s: string) => s.replace(/\s/g, '')
    var str = '＝　－-―～〜━『』~…！？。♥❤☆♡★‥○⁉,.-【】◆●∽＋‼＿◯※♠×▼％#∞’&!＇？＊*＆［］＜＞「」¨／◇：♪･＠°、，△《》†〇·’“”√≪≫＃→♂%~■■■‘〈〉Ω♀⇒≒§■♀⇒←∬🕊¡Ι≠±『』♨❄—~Σ⇔↑↓‡▽□』〈〉＾';
    expect(replaceCharToSpace(str).replace(/\s/g, '')).toBe("- ~ ,.- # &! * %~ 🕊 ~".replace(/\s/g, ''))
    str = '①②③④⑤⑥⑦⑧⑨¹²³⁴⁵⁶⁷⁸⁹⁰'
    expect(replaceCharToSpace(str)).toBe(new Array(str.length).fill(' ').join(''))
    var rag = 'ＲａｇｎａｒｏｋＩｘｃａ.'
    expect(replaceCharToSpace(rag)).toBe(rag)
    str = 'Ｒａｇｎ☆ａｒｏｋ♥Ｉ❤ｘｃ♡ａ.'
    expect(removeSpace(replaceCharToSpace(str))).toBe(rag)
  })
})
