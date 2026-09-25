# XLayer R2 authorized metadata repair

[XLayer][AF-XLAYER-R2][XLayerPM]

The user explicitly approved this exact repair on 2026-09-26 (Asia/Shanghai). The original UI source omitted its required body trailers. Its corrected object appends only `Agent-ID: Macbeth04` and `Task-ID: AF-XLAYER-R2-04-UI`. The corresponding manager import uses those trailers and the corrected source reference; seven unpublished manager descendants reconnect their parent. Every code tree, author, committer and timestamp is unchanged.

The original records remain under these local evidence refs:

- `refs/alphaforge/metadata-repair/xlayer-r2-20260926-original-source` → `6cf62d4a3d5b0452626681978c17e6ae40a632ea`
- `refs/alphaforge/metadata-repair/xlayer-r2-20260926-original-manager` → `715b68b0a80e92085a12bc49288333dc0ec2498c`

The original public branch `macbeth04/xlayer-r2-ui` is unchanged. The corrected source is published separately as `macbeth04/xlayer-r2-ui-corrected`, retaining the exact Macbeth04 / AF-XLAYER-R2-04-UI assignment. No force push is used. Published manager `37077cfcae221352b4b3c7e9d1bb3810e98aa6be` remains an ancestor of the corrected manager.

| Original object | Corrected object | Unchanged tree | Message changed |
| --- | --- | --- | --- |
| 6cf62d4a3d5b0452626681978c17e6ae40a632ea | cfaeb0f3bb1286dd074e8895aaf7b1194a0799e9 | eab6e5073601c2804311dc59bd4e93b3d610caac | Yes |
| 47a527489f49655b567267935d31aab1382f3c01 | 2c4796bd92db62e47ee5961b67c03177df2aeb5b | 8eea63f8c9737b76b860df7b11231b6f3a12707d | Yes |
| 28ba5f483830fe0b5c392db51076ba186f995819 | 3250d7760267544b0d1703c32076736cd2c268f5 | e5b3c8e26f6b6a9087a55c52e8b02ca8217fe8dd | No |
| 807595d90cf8208ae094abe8141a08d7f9c75507 | c7d67482d7870a5caf1f44b6e45e485d91556169 | eb8c0b0fa1e901c3ee51643f166436bd4bcf145e | No |
| 80910f8f2a9ad2e86e13a9c7d094c912100adf0b | 644aa9eb3226f382209f89a5ff055d1ff171667d | 93d8b2dd47a52f27df540f9477f728c9a4df4a2b | No |
| 2248d611b11490a7be6b8b84270f544ae1173e2c | 2a33c266a623b2b8723b46deb8a71983af9f2f80 | dc4a00263709d991fbc14b2de54c5dc14e83aba8 | No |
| 4ca9ea6b85a1385ff2dd671238b310b60ace9f8b | 998e59ccf74917fef3eec37c17b4993f1b88803c | 8cf7ee95e3ba5b6775711caf5df9a7c0d195982b | No |
| b662d98b513a70b88e50a15805432814ea276e7e | 812afe860c2fbf5257de4546d522c47adb064cf1 | b731ff9dbbac3e78d3c8afbeb77570e276706aaa | No |
| 715b68b0a80e92085a12bc49288333dc0ec2498c | ab065867db5dc84edd0beb5540c4213af41f7f75 | 89d6ddb6206f5e30f298643b990d268d57b8b785 | No |

An independent read-only review verified all nine actual object bytes against the approved proposal, the retained refs, unchanged trees and headers, the preserved working-tree diff, and fast-forward ancestry. Separate regression review passed 34 tests: the exact corrected source is accepted while missing identity, wrong owner, duplicate task and unassigned suffixes remain rejected.

Historical scanner and collector reports retain their original commit bindings and observed failures. The earlier collector for `715b68b` recorded 9 PASS, 2 FAIL and 4 NOT_RUN; its original report and logs are preserved locally. The Vite-config and invalid-listen fixture defects were subsequently repaired. Fresh candidate evidence must be produced by the normal C/R/S tools; this repair does not relabel prior evidence or authorize deployment.
