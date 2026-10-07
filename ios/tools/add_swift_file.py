#!/usr/bin/env python3
"""Register an existing Swift file in BFStock.xcodeproj (build file, file ref, group, Sources phase).

usage: add_swift_file.py Views/News NewsTabView.swift   (creates the group if the directory is new)
"""
import os, re, sys, uuid

PBX = os.path.join(os.path.dirname(__file__), "..", "BFStock.xcodeproj", "project.pbxproj")


def new_id(s):
    while True:
        i = uuid.uuid4().hex[:24].upper()
        if i not in s:
            return i


GROUP_RE = re.compile(r"\t\t(\w{24}) /\* [^*]+ \*/ = \{\n\t\t\tisa = PBXGroup;\n(.*?)\n\t\t\};\n", re.S)


def find_group(s, path_parts):
    """Match for the PBXGroup reached by following `path` names from the root group, or None."""
    groups = {m.group(1): m for m in GROUP_RE.finditer(s)}

    def path_of(m):
        pm = re.search(r"\n\t\t\tpath = ([^;]+);", m.group(2))
        return pm.group(1) if pm else None

    def children(m):
        cm = re.search(r"children = \(\n(.*?)\t\t\t\);", m.group(2), re.S)
        return re.findall(r"(\w{24}) /\*", cm.group(1)) if cm else []

    # candidates for the first path part are any group with that path; follow children for the rest
    def walk(m, rest):
        if not rest:
            return m
        for cid in children(m):
            cm = groups.get(cid)
            if cm and path_of(cm) == rest[0]:
                r = walk(cm, rest[1:])
                if r:
                    return r
        return None

    for m in groups.values():
        if path_of(m) == path_parts[0]:
            r = walk(m, path_parts[1:])
            if r:
                return r
    return None


def main():
    group_path, fname = sys.argv[1], sys.argv[2]
    parts = group_path.split("/")
    s = open(PBX).read()
    if fname in s:
        print("already registered:", fname); return
    file_id, build_id = new_id(s), None
    s2 = s
    build_id = new_id(s2 + file_id)

    s2 = s2.replace("/* Begin PBXBuildFile section */\n",
        f"/* Begin PBXBuildFile section */\n\t\t{build_id} /* {fname} in Sources */ = {{isa = PBXBuildFile; fileRef = {file_id} /* {fname} */; }};\n", 1)
    s2 = s2.replace("/* Begin PBXFileReference section */\n",
        f"/* Begin PBXFileReference section */\n\t\t{file_id} /* {fname} */ = {{isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = {fname}; sourceTree = \"<group>\"; }};\n", 1)

    g = find_group(s2, parts)
    if g is None:  # new directory: create a group under its parent
        parent = find_group(s2, parts[:-1])
        assert parent, f"parent group {parts[:-1]} not found"
        gid = new_id(s2)
        block = (f"\t\t{gid} /* {parts[-1]} */ = {{\n\t\t\tisa = PBXGroup;\n\t\t\tchildren = (\n"
                 f"\t\t\t\t{file_id} /* {fname} */,\n\t\t\t);\n\t\t\tpath = {parts[-1]};\n\t\t\tsourceTree = \"<group>\";\n\t\t}};\n")
        s2 = s2.replace("/* Begin PBXGroup section */\n", "/* Begin PBXGroup section */\n" + block, 1)
        pg = find_group(s2, parts[:-1])
        ins = s2.index("\t\t\t);\n", pg.start(2))
        s2 = s2[:ins] + f"\t\t\t\t{gid} /* {parts[-1]} */,\n" + s2[ins:]
    else:
        ins = s2.index("\t\t\t);\n", g.start(2))
        s2 = s2[:ins] + f"\t\t\t\t{file_id} /* {fname} */,\n" + s2[ins:]

    sp = s2.index("/* Begin PBXSourcesBuildPhase section */")
    files_at = s2.index("\t\t\tfiles = (\n", sp) + len("\t\t\tfiles = (\n")
    s2 = s2[:files_at] + f"\t\t\t\t{build_id} /* {fname} in Sources */,\n" + s2[files_at:]
    open(PBX, "w").write(s2)
    print("registered", fname, "in", group_path)


main()
