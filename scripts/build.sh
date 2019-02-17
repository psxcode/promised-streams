#!/bin/bash
usage(){
	echo "Usage: $0 path"
	exit 1
}

is_package_dir(){
	local f="$1/package.json"
	[[ -f "$f" ]] && return 0 || return 1
}

remove_build_dir(){
  local f="$1/build"
  [[ -d "$f" ]] && rm -r "$f"
}

# invoke  usage
# call usage() function if filename not supplied
[[ $# -eq 0 ]] && usage

# Invoke is_file_exits
if ( is_package_dir "$1" )
then
  remove_build_dir "$1"
  srcPath="$1/src"
  outDir="$1/build"
  configPath="$PWD/$1/tsconfig.build.json"

  node_modules/.bin/tsc -p $configPath
  BABEL_ENV=production node_modules/.bin/babel $srcPath -d $outDir -x '.ts'
else
 echo "File not found"
 exit 1
fi
