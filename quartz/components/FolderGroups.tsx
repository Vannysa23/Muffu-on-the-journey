import { QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { resolveRelative, FullSlug, SimpleSlug } from "../util/path"
import { QuartzPluginData } from "../plugins/vfile"
import { byDateAndAlphabetical } from "./PageList"

interface Options {
  limit: number
}

const defaultOptions: Options = {
  limit: 4,
}

export default ((opts?: Partial<Options>) => {
  const options: Options = { ...defaultOptions, ...opts }

  function FolderGroups({ allFiles, fileData, cfg }: QuartzComponentProps) {
    // Group files by their top-level folder
    const groups: Record<string, QuartzPluginData[]> = {}

    for (const file of allFiles) {
      const slug = file.slug ?? ""
      if (slug.endsWith("/index")) continue // skip folder index files
      const parts = slug.split("/")
      if (parts.length < 2) continue
      const folder = parts[0]
      if (!groups[folder]) groups[folder] = []
      groups[folder].push(file)
    }

    const sortedFolders = Object.keys(groups).sort()

    return (
      <div class="folder-groups">
        {sortedFolders.map((folder) => {
          const notes = groups[folder].sort(byDateAndAlphabetical(cfg)).slice(0, options.limit)
          const total = groups[folder].length
          const folderTitle = folder.replace(/-/g, " ")

          return (
            <div class="folder-group">
              <h3>
                {folderTitle}
              </h3>
              <ul class="folder-group-list">
                {notes.map((note) => (
                  <li>
                    <a href={resolveRelative(fileData.slug!, note.slug as SimpleSlug)}>
                      {note.frontmatter?.title ?? note.slug}
                    </a>
                  </li>
                ))}
              </ul>
              {total > options.limit && (
                <a
                  href={resolveRelative(fileData.slug!, folder as SimpleSlug)}
                  class="see-more"
                >
                  See {total - options.limit} more →
                </a>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  return FolderGroups
}) satisfies QuartzComponentConstructor