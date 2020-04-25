# Paperjs Offset
The dicussion to implement a offset function in paper.js started years ago, yet the author have not decided to put a offset feature into the library. So I implement an extension of my own.
<br/>As far as I know, the author has promised recently to implement a native offset functionality in near feature, the library will be closed once the native implement is published.
<br/>This library implement both path offset and stroke offset, you may offset a path or expand a stroke like what you did in Adobe illustrator. Offset complicate path may cause unwanted self intersections, this library already take care some cases but bugs still exists. Please let me notice the false conditions in the issue pannel so I can correct it.

## Usage
For node development, use
```sh
npm install paperjs-offset
```
And then, in you project:
```javascript
import paper from 'paper'
import { PaperOffset } from 'paperjs-offset'

// call offset
PaperOffset.offset(path, offset, options)

// call offset stroke
PaperOffset.offsetStroke(path, offset, options)
```

You may still use the old way to extend paperjs module, which is **deprecated** and will be removed in future version.
```typescript
import ExtendPaperJs from 'paperjs-offset'
// extend paper.Path, paper.CompoundPath with offset, offsetStroke method
ExtendPaperJs(paper);

// Warning: The library no longer include extended definitions for paper.Path & paper.CompoundPath, you may need your own declarations to use extension in typescript.
(path as any).offset(10);
```

Or for web development, include the **paperjs-offset.js** or **paperjs-offset.min.js** in demo folder.
<br/>The library now exposes a global variable **PaperOffset**, again, the extension of **paper.Path** and **paper.CompoundPath** with offset/offsetStroke functions is still available, but no longer recommended.
```javascript
let path = new paper.Path(/* params */)

PaperOffset.offset(path, 10, { join: 'round' })
PaperOffset.offsetStroke(path, 10, { cap: 'round' })

// deprecated
path.offset(10, { join: 'round' })
// deprecated
path.offsetStroke(10, { cap: 'round' })
```

Sample references:
```typescript
offset(path: paper.Path | paper.CompoundPath, offset: number, options?: OffsetOptions): paper.Path | paper.CompoundPath

offsetStroke(path: paper.Path | paper.CompoundPath, offset: number, options?: OffsetOptions): paper.Path | paper.CompoundPath

interface OffsetOptions {
  // the join style of offset path, default is 'miter'
  join?: 'miter' | 'bevel' | 'round';
  // the cap style of offset (only validate for offsetStroke), default is 'butt', ('square' will be supported in future)
  cap?: 'butt' | 'round';
  // the limit for miter style (refer to the miterLimit definition in paper)
  limit?: number;
  // whether the result should be insert into the canvas, default is true
  insert?: boolean;
}
```

## Preview
There are some cases that the library may return weird result or failed silently, please let me noticed in the project issues. And in some cases the library will yeild an ok result than a perfect one. Currently the library should give good results for closed shapes, but may fail in some open curve cases, I'm still working on it.
![Preview](/public/preview.jpg)

You can use open demo folder for simple cases demonstration.

## License
Distributed under the MIT license. See [LICENSE](https://github.com/glenzli/paperjs-offset/blob/master/LICENSE) for detail.