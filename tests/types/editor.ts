// tsc must validate browser DOM and shared domain types, not merely transpile syntax.
import type { Source, Pattern } from '../../api/_lib/core.js';
import { elements } from '../../api/_lib/editor/elements.js';

// @ts-expect-error Source dimensions are numbers, not untyped values.
const invalidSource: Source = { data: '', width: '256', height: 256 };
// @ts-expect-error Only supported shapes can enter editor state.
const invalidPattern: Pattern = 'unknown';
// @ts-expect-error Preview images are not form controls.
elements.result.value = 'not-an-input';
// @ts-expect-error Server-only ambient types must not leak into browser modules.
process.cwd();
void invalidSource;
void invalidPattern;
