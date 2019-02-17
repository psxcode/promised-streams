#!/bin/bash
usage(){
	echo "Usage: $0 path"
	exit 1
}

is_package_dir(){
	local f="$1/package.json"
  local buildDir="$1/build"
	[[ -f "$f" ]] && [[ -d "$buildDir" ]] && return 0 || return 1
}

[[ $# -eq 0 ]] && usage

if ( is_package_dir "$1" )
then
  cp LICENSE "$1/build"
  cp readme.md "$1/build"
  cp "$1/package.json" "$1/build"
else
 echo "No build directory"
 exit 1
fi
