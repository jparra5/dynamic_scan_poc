����
===========
���� ZIP �t�@�C���ɂ́A�l�b�g���[�N��� AppScan �v���[���X���Z�b�g�A�b�v���邽�߂ɕK�v�ȃt�@�C�����܂܂�Ă��܂��B

���g�p�̃A�v�����C���^�[�l�b�g����A�N�Z�X�s�\�ȏꍇ�A�A�v���ւ̃A�N�Z�X���ƃC���^�[�l�b�g�ւ̃A�N�Z�X�������� AppScan �v���[���X���쐬����K�v������܂��B����ɂ́AApplication Security on Cloud ���ڑ��ł��܂��B �v���L�V�[�ڑ����T�|�[�g����Ă��܂��B 


�O�����
=============
Windows Server�AWindows Client�A����� Linux �̗v���ɂ��ẮA�ȉ����Q�Ƃ��Ă��������B
- http://www.oracle.com/technetwork/java/javase/certconfig-2095354.html
AppScan �v���[���X�� 64 �r�b�g�̂݃T�|�[�g���܂��B


�菇
============
1. AppScan �v���[���X�E�t�@�C�����𓀂��āA���������g�p�̃T�C�g�Ɠ����l�b�g���[�N��ɂ���R���s���[�^�[�ɕۑ����܂��B ���̃R���s���[�^�[�́A�T�C�g����уC���^�[�l�b�g�ւ̃A�N�Z�X�����Ȃ���΂Ȃ�܂���B 

2. �v���[���X���v���L�V�[�ɂ���ăA�v����C���^�[�l�b�g�ɐڑ�����ꍇ�́A���̃Z�N�V�����̐����ɏ]���č\�����܂��B

3. �v���[���X�̃��[�g�E�t�H���_�[���ŁAstartPresence.sh (Linux)�A�܂��� startPresence.vbs (Windows) �������Ď��s���܂��B

4. �v���C�x�[�g�E�T�C�g�̃X�L�������\������ꍇ�́AApplication Security on Cloud �����g�p�̃A�v���Ɉ��S�ɐڑ��ł���悤�Ƀv���[���X��I�����܂��B 	
	
�v���[���X�̃v���L�V�[�ݒ�̍\��
=================================
���g�p�̃l�b�g���[�N�ŁA�A�v���ɐڑ����邽�߂̃v���[���X�̃v���L�V�[ (�����v���L�V�[) �܂��̓C���^�[�l�b�g�ɐڑ����邽�߂̃v���[���X�̃v���L�V�[ (���M�v���L�V�[) ���K�v�ȏꍇ�A�ȉ��̂悤�ɍ\�����܂��B

1. �v���[���X�̃��[�g�E�t�H���_�[�ŁAconfig.properties �����o���A�e�L�X�g�E�G�f�B�^�[�ŊJ���܂��B

2. �֘A�ݒ��ǉ� (�e�֘A�s�̐擪�ɂ��� "#" ���폜�j���āA�t�@�C����ۑ����܂��B (�uHost�v�ɂ͖��O�܂��� IP �A�h���X���w�肷�邱�Ƃɒ��ӂ��Ă��������B)

�Ⴆ�΁A�����v���L�V�[ IP 192.168.1.100 �ƃ|�[�g 3128 ���\������ɂ́A�ȉ��̂悤�ɕύX���܂��B

#internalProxyHost = 
#internalProxyPort =

 ���� 

internalProxyHost = 192.168.1.100 
internalProxyPort = 3128

3. startPresence.sh (Linux)�A�܂��� startPresence.vbs (Windows) �����s���ăv���[���X���J�n���܂��B