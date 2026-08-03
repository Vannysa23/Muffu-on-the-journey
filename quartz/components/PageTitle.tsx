import { pathToRoot } from "../util/path"
import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { classNames } from "../util/lang"
import { i18n } from "../i18n"

const PageTitle: QuartzComponent = ({ cfg, displayClass }: QuartzComponentProps) => {
  const title = cfg?.pageTitle ?? i18n(cfg.locale).propertyDefaults.title
  return (
    <a href="/" class={classNames(displayClass, "page-title")} style="display:flex;align-items:center;gap:0.5rem;text-decoration:none;">
      <img src="/static/profile.jpg" alt="profile" style="width:100px;height:100px;border-radius:5%;object-fit:cover;padding-left:50px" />
      <span>{title}</span>
    </a>
  )
}

PageTitle.css = `
.page-title {
  font-size: 1.75rem;
  margin: 0;
  font-family: var(--titleFont);
}
`

export default (() => PageTitle) satisfies QuartzComponentConstructor
