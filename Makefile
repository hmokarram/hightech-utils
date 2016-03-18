MOCHA_COV=./node_modules/mocha/bin/_mocha
MOCHA=./node_modules/mocha/bin/mocha
ISTANBUL=~/AppData/Roaming/npm/istanbul

ENVIRONMENT_VARIABLES = NODE_ENV=unittest

cov:
	@$(ENVIRONMENT_VARIABLES) \
	$(ISTANBUL) cover $(MOCHA_COV) test

test:
	@$(ENVIRONMENT_VARIABLES) \
	$(MOCHA) --recursive -R spec -t 15000 test

.PHONY:  cov test