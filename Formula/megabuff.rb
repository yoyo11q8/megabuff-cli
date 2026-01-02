class Megabuff < Formula
  desc "AI-powered prompt optimizer CLI with BYOK support for OpenAI"
  homepage "https://github.com/thesupermegabuff/megabuff-cli"
  url "https://registry.npmjs.org/megabuff/-/megabuff-0.1.1.tgz"
  sha256 "REPLACE_WITH_ACTUAL_SHA256"
  license "MIT"

  depends_on "node"

  def install
    system "npm", "install", *Language::Node.std_npm_install_args(libexec)
    bin.install_symlink Dir["#{libexec}/bin/*"]
  end

  test do
    assert_match "0.1.1", shell_output("#{bin}/megabuff --version")
  end
end
