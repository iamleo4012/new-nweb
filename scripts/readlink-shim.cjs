/**
 * readlink-shim.cjs — POSIX-compatible readlink() for volumes without
 * symlink support.
 *
 * The development working copy lives on a volume (mounted/virtual drive)
 * whose readlink() returns EISDIR for REGULAR FILES. POSIX requires EINVAL
 * ("not a symlink"), and build tooling (webpack snapshots, Turbopack page
 * collection) relies on that distinction — the wrong errno crashes
 * `next build` with "EISDIR: illegal operation on a directory, readlink".
 *
 * Loaded via `node --require ./scripts/readlink-shim.cjs` (see the build
 * script in package.json). It wraps fs.readlink / fs.readlinkSync /
 * fs.promises.readlink and translates EISDIR → EINVAL, which is also the
 * correct answer for directories and is what these tools expect for every
 * non-symlink. Real symlinks (if the volume ever supports them) still
 * resolve normally through the underlying call.
 */
"use strict";

const fs = require("fs");

function toEinval(err) {
  const e = new Error(
    String(err.message || "").replace("EISDIR", "EINVAL")
  );
  e.code = "EINVAL";
  e.errno = -4070; // libuv UV_EINVAL
  e.syscall = "readlink";
  e.path = err.path;
  return e;
}

function wrapSync(orig) {
  return function patchedReadlinkSync(target, options) {
    try {
      return orig.call(fs, target, options);
    } catch (err) {
      if (err && err.code === "EISDIR" && err.syscall === "readlink") throw toEinval(err);
      throw err;
    }
  };
}

function wrapAsync(orig) {
  return function patchedReadlink(target, options, callback) {
    if (typeof options === "function") {
      callback = options;
      options = undefined;
    }
    if (typeof callback !== "function") {
      return fs.promises.readlink(target, options);
    }
    orig.call(fs, target, options, function (err, result) {
      if (err && err.code === "EISDIR" && err.syscall === "readlink") {
        callback(toEinval(err), undefined);
        return;
      }
      callback(err, result);
    });
  };
}

fs.readlinkSync = wrapSync(fs.readlinkSync);
fs.readlink = wrapAsync(fs.readlink);
if (fs.promises && typeof fs.promises.readlink === "function") {
  const origP = fs.promises.readlink.bind(fs.promises);
  fs.promises.readlink = function (target, options) {
    return origP(target, options).catch(function (err) {
      if (err && err.code === "EISDIR" && err.syscall === "readlink") throw toEinval(err);
      throw err;
    });
  };
}
