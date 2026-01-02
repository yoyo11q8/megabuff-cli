class Megabuff < Formula
  desc "AI-powered prompt optimizer CLI with BYOK support for OpenAI"
  homepage "https://github.com/thesupermegabuff/megabuff-cli"
  url "https://registry.npmjs.org/megabuff/-/megabuff-0.1.0.tgz"
  sha256 "cc85ed27f138f4ca1406f9d7e0da522267477a4acb2329dd0b801ed67fca8bdf"
  license "MIT"

  depends_on "node"

  def install
    system "npm", "install", *Language::Node.std_npm_install_args(libexec)
    bin.install_symlink Dir["#{libexec}/bin/*"]
  end

  test do
    assert_match "0.1.0", shell_output("#{bin}/megabuff --version")
  end
end
