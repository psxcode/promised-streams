#!/bin/bash
usage() {
  echo "Usage: $0 path"
  exit 1
}

is_package_dir() {
  local f="$1/package.json"

  [[ -f "$f" ]] && return 0 || return 1
}

remove_build_dir() {
  local f="$1/build"

  [[ -d "$f" ]] && rm -r "$f"
}

fix_src_suffix() {
  local dir="$1"

  for filename in "$dir"/*.{d.ts,js}; do
    [ -e "$filename" ] || continue
    sed -i '' "s/\/src'/'/g" "$filename"
  done
}

# invoke  usage
# call usage() function if filename not supplied
[[ $# -eq 0 ]] && usage

# Invoke is_file_exits
if (is_package_dir "$1"); then
  remove_build_dir "$1"

  node_modules/.bin/tsc -p "$1/tsconfig.build.json"
  BABEL_ENV=production node_modules/.bin/babel "$1/src" -d "$1/build" -x '.ts'

  fix_src_suffix "$1/build"
else
  echo "File not found"
  exit 1
fi
