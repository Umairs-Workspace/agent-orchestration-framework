
# 200 · Rename refine's --autonomous flag to --all — Outcome

## Delivered

### Whole-item refine flag
`--all` is the single spelling of the whole-item refine cascade: `/aof:refine` and `aof work drive refine` accept it, the loop's child drive and the mesh assignment directive emit it, and `--autonomous` is no longer accepted anywhere (a non-refine `drive` refuses `--all` as `drive-all-refine-only`).
