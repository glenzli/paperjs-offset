# Paperjs Offset
The dicussion to implement a offset function in paper.js started years ago, yet the author have not decided to put a offset feature into the library. So I implement an extension of my own.
<br/>This library implement both path offset and stroke offset, you may offset a path or expand a stroke like what you did in Adobe illustrator. Offset complicate path may cause unwanted self intersections, this library already take care some cases but bugs still exists. Please let me notice the false conditions in the issue pannel so I can correct it.

## Usage
For node development, use
```sh
npm install paperjs-offset
```
And then, in you project:
```javascript
import paper from 'paper'
import ExtendPaperJs from 'paperjs-offset'

ExtendPaperJs(paper)
```
Or for web development, include the **paperjs-offset.js** or **paperjs-offset.min.js** in demo folder.
<br/>The library extends **paper.Path** and **paper.CompoundPath** object, with offset/offsetStroke functions.
```javascript
let path = new paper.Path(/* params */)
path.offset(10, { join: 'round' })
path.offsetStroke(10, { cap: 'round' })
```
Both offset/offsetStroke take the form of **f(offset: number, options?: {})**, the options have following parameters:
<br/>&nbsp;&nbsp;**join**: the join style of offset path, you can choose **'miter'**, **'bevel'** or **'round'**, default is **'miter'**.
<br/>&nbsp;&nbsp;**limit**: the limit for miter style (refer the miterLimit's definition in paper.js).
<br/>&nbsp;&nbsp;**cap**: the cap style of offset (only available in offsetStroke), you can choose **'butt'** and **'round'** (**'square'** is not supported yet), default is **'butt'**
<br/>&nbsp;&nbsp;**insert**: whether the result should be insert into the canvas, default is **true**.

## Preview
There are some cases that the library may return weird result or failed silently, please let me noticed in the project issues. And in some cases the library will yeild an ok result than a perfect one.
![Preview](/public/preview.jpg)

## Development
```sh
# build es5/umd//iife packages
npm run build
```
You can use open demo folder for simple cases demonstration.

## License
Distributed under the MIT license. See [LICENSE](https://github.com/luz-alphacode/paperjs-offset/blob/master/LICENSE) for detail.