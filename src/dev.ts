import TinySegmenter from 'tiny-segmenter'
import { normalizeQueryEGS } from './sites/erogamescape';
import { getShortenedQuery } from './utils/utils';
// sample code from http://chasen.org/~taku/software/TinySegmenter/
var segmenter = new TinySegmenter(); // インスタンス生成
var segs = segmenter.segment(getShortenedQuery(normalizeQueryEGS('すてぃーるMyはぁと～Rhapsody of moonlight～'))); // 単語の配列が返る
console.log(segs); // 表示
