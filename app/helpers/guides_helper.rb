# Renders the docs guides from Markdown in app/views/pages/guides/<slug>.md.
#
# Conventions, so the .md files stay plain Markdown:
# - [#printing-legion][slack] and [@nimit][nimit] use the shared links in SHARED_LINKS.
# - Link styling is picked from the link text: "#channel" → orange highlight,
#   "@person" → red highlight, a bare URL → orange link. External links open in a new tab.
# - `inline code` renders as the italic underlined mono text used for example URLs.
# - Under a heading named "FAQ", each ### heading is a question and the text after it the answer.
# - Raw HTML is allowed as an escape hatch.
module GuidesHelper
  GUIDES_DIR = Rails.root.join("app/views/pages/guides")
  SHARED_LINKS = {
    "slack" => ApplicationHelper::SLACK_CHANNEL,
    "nimit" => "https://hackclub.enterprise.slack.com/team/U0735FTMS3V"
  }.freeze
  MARKDOWN_OPTIONS = { render: { unsafe: true }, extension: { header_ids: nil, autolink: true } }.freeze
  HEADINGS = %w[h1 h2 h3 h4 h5 h6].freeze

  @cache = {}
  class << self; attr_reader :cache; end

  def render_guide(slug)
    path = GUIDES_DIR.join("#{slug}.md")
    key = [ slug, File.mtime(path) ]
    (GuidesHelper.cache[key] ||= GuidesHelper.build(File.read(path))).html_safe
  end

  def self.build(markdown)
    refs = SHARED_LINKS.map { |name, url| "[#{name}]: #{url}" }.join("\n")
    html = Commonmarker.to_html("#{markdown}\n\n#{refs}\n", options: MARKDOWN_OPTIONS)
    doc = Nokogiri::HTML5.fragment(html)
    style_links(doc)
    doc.css("code").each { |c| c.name = "span"; c["class"] = "mono-i" }
    build_faqs(doc)
    wrap_blocks(doc)
    doc.to_html
  end

  def self.style_links(doc)
    doc.css("a[href]").each do |a|
      text = a.text.strip
      style = if text.start_with?("#") then "hl"
      elsif text.start_with?("@") then "hl-red"
      elsif text.match?(%r{\Ahttps?://}) then "hl-link"
      end
      a["class"] ||= style if style
      next unless a["href"].match?(%r{\Ahttps?://})
      a["target"] ||= "_blank"
      a["rel"] ||= "noopener"
    end
  end

  # ## FAQ / ### question / answer… → <dl class="faq"><dt>question</dt><dd>answer…</dd></dl>
  def self.build_faqs(doc)
    doc.css(HEADINGS.join(",")).select { |h| h.text.strip.casecmp?("faq") }.each do |faq|
      level = faq.name[1].to_i
      section = []
      node = faq.next_element
      while node && !(HEADINGS.include?(node.name) && node.name[1].to_i <= level)
        section << node
        node = node.next_element
      end
      section.each(&:unlink)

      dl = Nokogiri::XML::Node.new("dl", doc.document)
      dl["class"] = "faq"
      section.slice_before { |n| HEADINGS.include?(n.name) }.each do |question, *answer|
        dl.add_child("<dt></dt>").first.inner_html = question.inner_html
        dd = dl.add_child("<dd></dd>").first
        # a one-paragraph answer goes in the <dd> bare; longer ones keep their blocks
        answer = answer.first.children if answer.one? && answer.first.name == "p"
        answer.each { |n| dd.add_child(n) }
      end
      faq.add_next_sibling(dl)
    end
  end

  # Groups the content between headings into .prose-block divs, matching the page's spacing.
  def self.wrap_blocks(doc)
    block = nil
    doc.children.to_a.each do |node|
      next if node.text? && node.text.strip.empty?
      if HEADINGS.include?(node.name) || node.name == "dl"
        block = nil
      else
        block ||= node.add_previous_sibling(Nokogiri::XML::Node.new("div", doc.document)).tap { |d| d["class"] = "prose-block" }
        block.add_child(node)
      end
    end
  end
end
