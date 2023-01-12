{ pkgs }: {
	deps = [
		pkgs.unixtools.ifconfig
  pkgs.klibcShrunk
  pkgs.mkinitcpio-nfs-utils
  pkgs.nodejs-16_x
        pkgs.nodePackages.typescript-language-server
        pkgs.yarn
        pkgs.replitPackages.jest
	];
}